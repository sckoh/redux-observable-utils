// @flow

import dayjs from 'dayjs';
import get from 'lodash/get';
import set from 'lodash/set';
import type {
  RequestTypes,
  FetchData,
  Action,
  RequestReducer,
  RequestReducerByKey,
  RequestDucks,
  RequestByKeyDucks,
} from './type';
import { config } from './config';

const FETCH = 'FETCH';
const INVALIDATE = 'INVALIDATE';
const CLEAR = 'CLEAR';
const INVALIDATE_ALL = 'INVALIDATE_ALL';
const CLEAR_ALL = 'CLEAR_ALL';
const RESET_PAGING = 'RESET_PAGING';
const REQUEST = 'REQUEST';
const SUCCESS = 'SUCCESS';
const FAILURE = 'FAILURE';

export const createRequestTypes = (base: string) =>
  [
    FETCH,
    INVALIDATE,
    CLEAR,
    INVALIDATE_ALL,
    CLEAR_ALL,
    RESET_PAGING,
    REQUEST,
    SUCCESS,
    FAILURE,
  ].reduce((acc, type) => {
    acc[type] = `${base}_${type}`;
    return acc;
  }, {});

export const createAction = (type: string, payload?: any = {}) => ({
  type,
  ...payload,
});

export const createNamePrefix = (moduleName: string, parentModuleName?: string) =>
  parentModuleName ? `${parentModuleName}.${moduleName}` : `${moduleName}`;

export const createRequestActions = (requestTypes: RequestTypes) => ({
  fetch: (params?: Object = {}) => createAction(requestTypes.FETCH, { params }),
  invalidate: (params?: Object = {}) => createAction(requestTypes.INVALIDATE, { params }),
  clear: (params?: Object = {}) => createAction(requestTypes.CLEAR, { params }),
  invalidateAll: (params?: Object = {}) => createAction(requestTypes.INVALIDATE_ALL, { params }),
  clearAll: (params?: Object = {}) => createAction(requestTypes.CLEAR_ALL, { params }),
  resetPaging: (params?: Object = {}) => createAction(requestTypes.RESET_PAGING, { params }),
  request: (params?: Object = {}) => createAction(requestTypes.REQUEST, { params }),
  success: (payload?: any, params?: Object = {}) =>
    createAction(requestTypes.SUCCESS, { payload, params }),
  failure: (error?: any, params?: Object = {}) =>
    createAction(requestTypes.FAILURE, { error, params }),
});

const requestInitialState = {
  isFetching: false,
  didInvalidate: false,
  payload: undefined,
  error: undefined,
  refreshing: false,
};

const pagingInitialState = {
  page: 0,
  itemsEnd: false,
  paginationFetched: undefined,
};

const pagingRequestInitialState = {
  ...requestInitialState,
  ...pagingInitialState,
};

export const createRequestReducer = ({
  requestTypes,
  initialState,
  mapActionToPayload = action => action.payload,
  options,
}: RequestReducer) => {
  const paging = get(options, 'paging');
  const finalInitialState =
    initialState || (paging ? pagingRequestInitialState : requestInitialState);
  return (state: FetchData = finalInitialState, action: Action) => {
    switch (action.type) {
      case requestTypes[INVALIDATE]:
        return {
          ...state,
          didInvalidate: true,
        };
      case requestTypes[CLEAR]:
      case requestTypes[CLEAR_ALL]:
        return {
          ...finalInitialState,
        };
      case requestTypes[RESET_PAGING]:
        return {
          ...state,
          ...pagingInitialState,
        };
      case requestTypes[REQUEST]:
        return {
          ...state,
          isFetching: true,
          refreshing: !!action.params.refreshing,
          didInvalidate: false,
        };
      case requestTypes[SUCCESS]: {
        const newState = {
          ...state,
          isFetching: false,
          refreshing: false,
          didInvalidate: false,
          lastUpdated: dayjs(),
          error: undefined,
        };
        const payload = mapActionToPayload(action);
        if (paging && action.params.page !== 0) {
          newState.payload = [...newState.payload, ...payload];
        } else {
          newState.payload = payload;
        }
        if (paging) {
          newState.page = action.params.page + 1;
          newState.itemsEnd = !get(payload, 'length');
          set(newState, `paginationFetched.${action.params.page}`, true);
        }
        return newState;
      }
      case requestTypes[FAILURE]:
        return {
          ...state,
          error: action.error,
          isFetching: false,
          refreshing: false,
        };
      default:
        return state;
    }
  };
};

type ItemsByIdProps = {
  types: Array<string>,
  type: string,
  mapItemToId: Function,
  mapActionToPayload?: Function,
};

export const itemsById = ({
  type,
  types,
  mapItemToId,
  mapActionToPayload = action => action.payload,
}: ItemsByIdProps) => (state: any = {}, action: Action) => {
  if (action.type === type || (types && types.indexOf(action.type) > -1)) {
    return {
      ...state,
      ...mapActionToPayload(action).reduce((obj, item) => {
        obj[mapItemToId(item)] = item;
        return obj;
      }, {}),
    };
  }
  return state;
};

export const objectById = ({
  type,
  mapItemToId,
  mapActionToPayload = action => action.payload,
}: {
  type: string,
  mapItemToId: Function,
  mapActionToPayload?: Function,
}) => (state: any = {}, action: Action) => {
  switch (action.type) {
    case type:
      return {
        ...state,
        [mapItemToId(mapActionToPayload(action))]: mapActionToPayload(action),
      };
    default:
      return state;
  }
};

const getRequestKeys = (action, mapActionToKey) => {
  let keys = mapActionToKey(action);
  if (keys && keys.constructor !== Array) {
    keys = [keys];
  }
  return keys;
};

export const createRequestReducerByKey = ({
  requestTypes,
  mapActionToKey,
  mapActionToPayload = action => action.payload,
  options,
}: RequestReducerByKey) => (state: any = {}, action: Action) => {
  switch (action.type) {
    case requestTypes[INVALIDATE_ALL]:
    case requestTypes[CLEAR_ALL]:
      return {};
    case requestTypes[INVALIDATE]:
    case requestTypes[CLEAR]:
    case requestTypes[RESET_PAGING]:
    case requestTypes[REQUEST]:
    case requestTypes[SUCCESS]:
    case requestTypes[FAILURE]: {
      const keys = getRequestKeys(action, mapActionToKey);
      return {
        ...state,
        ...keys.reduce((obj, key) => {
          let payload;
          if (action.payload !== undefined) {
            payload = mapActionToPayload(action, key);
          }
          obj[key] = createRequestReducer({ requestTypes, options })(state[key], {
            ...action,
            payload,
          });
          return obj;
        }, {}),
      };
    }
    default:
      return state;
  }
};

export const getSelector = (reducerName: string) => {
  if (get(config, 'prefix')) {
    return (state: any) => get(state, `${config.prefix}.${reducerName}`);
  }
  return (state: any) => get(state, `${reducerName}`);
};

// create request ducks
// {
//   isFetching: true,
//   payload: undefined,
// }
export const createRequestDucks = ({
  moduleName,
  reducerName,
  mapActionToPayload,
  parentModuleName,
  options,
}: RequestDucks) => {
  const requestTypes = createRequestTypes(`${moduleName}/${reducerName}`);
  const requestActions = createRequestActions(requestTypes);
  const reducer = createRequestReducer({
    requestTypes,
    mapActionToPayload,
    options,
  });
  const modName = parentModuleName ? `${parentModuleName}.${moduleName}` : moduleName;
  const selector = getSelector(`${modName}.${reducerName}`);
  return {
    requestTypes,
    requestActions,
    reducer,
    selector,
    reducerName,
  };
};

// create request ducks with object structure group by key
// {
//   1: {
//     isFetching: true,
//     payload: undefined,
//   }
// }
export const createRequestByKeyDucks = ({
  moduleName,
  reducerName,
  mapActionToKey,
  mapActionToPayload,
  parentModuleName,
  options,
}: RequestByKeyDucks) => {
  const requestTypes = createRequestTypes(`${moduleName}/${reducerName}`);
  const requestActions = createRequestActions(requestTypes);
  const reducer = createRequestReducerByKey({
    requestTypes,
    mapActionToKey,
    mapActionToPayload,
    options,
  });
  const modName = parentModuleName ? `${parentModuleName}.${moduleName}` : moduleName;
  const selector = getSelector(`${modName}.${reducerName}`);
  return {
    requestTypes,
    requestActions,
    reducer,
    selector,
    reducerName,
  };
};
