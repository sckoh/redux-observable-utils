// @flow

import moment from 'moment';
import get from 'lodash/get';
import type {
  RequestTypes,
  FetchData,
  Action,
  RequestReducer,
  RequestReducerByKey,
  RequestDucks,
  RequestByKeyDucks,
} from './type';

const FETCH = 'FETCH';
const INVALIDATE = 'INVALIDATE';
const CLEAR = 'CLEAR';
const INVALIDATE_ALL = 'INVALIDATE_ALL';
const CLEAR_ALL = 'CLEAR_ALL';
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
    REQUEST,
    SUCCESS,
    FAILURE,
  ].reduce(
    (acc, type) => {
      acc[type] = `${base}_${type}`;
      return acc;
    },
    {},
  );

export const createAction = (type: string, payload?: any = {}) => ({
  type,
  ...payload,
});

export const createNamePrefix = (
  moduleName: string,
  parentModuleName?: string,
) => parentModuleName ? `${parentModuleName}.${moduleName}` : `${moduleName}`;

export const createRequestActions = (requestTypes: RequestTypes) => ({
  fetch: (params?: Object = {}) => createAction(requestTypes.FETCH, { params }),
  invalidate: (params?: Object = {}) =>
    createAction(requestTypes.INVALIDATE, { params }),
  clear: (params?: Object = {}) => createAction(requestTypes.CLEAR, { params }),
  invalidateAll: (params?: Object = {}) =>
    createAction(requestTypes.INVALIDATE_ALL, { params }),
  clearAll: (params?: Object = {}) =>
    createAction(requestTypes.CLEAR_ALL, { params }),
  request: (params?: Object = {}) =>
    createAction(requestTypes.REQUEST, { params }),
  success: (payload?: any, params?: Object = {}) =>
    createAction(requestTypes.SUCCESS, { payload, params }),
  failure: (error?: any, params?: Object = {}) =>
    createAction(requestTypes.FAILURE, { error, params }),
});

export const createRequestReducer = (
  {
    requestTypes,
    initialState = {
      isFetching: false,
      didInvalidate: false,
      payload: undefined,
      error: undefined,
    },
    mapActionToPayload = action => action.payload,
  }: RequestReducer,
) =>
  (state: FetchData = initialState, action: Action) => {
    switch (action.type) {
      case requestTypes[INVALIDATE]:
        return {
          ...state,
          didInvalidate: true,
        };
      case requestTypes[CLEAR]:
      case requestTypes[CLEAR_ALL]:
        return {
          ...initialState,
        };
      case requestTypes[REQUEST]:
        return {
          ...state,
          isFetching: true,
          didInvalidate: false,
        };
      case requestTypes[SUCCESS]:
        return {
          ...state,
          isFetching: false,
          didInvalidate: false,
          payload: mapActionToPayload(action),
          lastUpdated: moment(),
          error: undefined,
        };
      case requestTypes[FAILURE]:
        return {
          ...state,
          error: action.error,
          isFetching: false,
        };
      default:
        return state;
    }
  };

export const itemsById = (
  {
    type,
    mapItemToId,
    mapActionToPayload = action => action.payload,
  }: { type: string, mapItemToId: Function, mapActionToPayload?: Function },
) => {
  if (typeof type !== 'string') {
    throw new Error('Expected type to be strings.');
  }

  return (state: any = {}, action: Action) => {
    switch (action.type) {
      case type:
        return {
          ...state,
          ...mapActionToPayload(action).reduce(
            (obj, item) => {
              obj[mapItemToId(item)] = item;
              return obj;
            },
            {},
          ),
        };
      default:
        return state;
    }
  };
};

export const objectById = (
  {
    type,
    mapItemToId,
    mapActionToPayload = action => action.payload,
  }: { type: string, mapItemToId: Function, mapActionToPayload?: Function },
) =>
  (state: any = {}, action: Action) => {
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

export const createRequestReducerByKey = (
  {
    requestTypes,
    mapActionToKey,
    mapActionToPayload = action => action.payload,
  }: RequestReducerByKey,
) =>
  (state: any = {}, action: Action) => {
    switch (action.type) {
      case requestTypes[INVALIDATE_ALL]:
      case requestTypes[CLEAR_ALL]:
        return {};
      case requestTypes[INVALIDATE]:
      case requestTypes[CLEAR]:
      case requestTypes[REQUEST]:
      case requestTypes[SUCCESS]:
      case requestTypes[FAILURE]: {
        let keys = mapActionToKey(action);
        if (keys && keys.constructor !== Array) {
          keys = [keys];
        }
        return {
          ...state,
          ...keys.reduce(
            (obj, key) => {
              let payload;
              if (action.payload) {
                payload = mapActionToPayload(action, key);
              }
              obj[key] = createRequestReducer({ requestTypes })(state[key], {
                ...action,
                payload,
              });
              return obj;
            },
            {},
          ),
        };
      }
      default:
        return state;
    }
  };

// create request ducks
// {
//   isFetching: true,
//   payload: undefined,
// }
export const createRequestDucks = (
  {
    moduleName,
    reducerName,
    mapActionToPayload,
    parentModuleName,
  }: RequestDucks,
) => {
  const requestTypes = createRequestTypes(`${moduleName}/${reducerName}`);
  const requestActions = createRequestActions(requestTypes);
  const reducer = createRequestReducer({ requestTypes, mapActionToPayload });
  const modName = parentModuleName
    ? `${parentModuleName}.${moduleName}`
    : moduleName;
  const selector = (state: any) => get(state, `${modName}.${reducerName}`);
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
export const createRequestByKeyDucks = (
  {
    moduleName,
    reducerName,
    mapActionToKey,
    mapActionToPayload,
    parentModuleName,
  }: RequestByKeyDucks,
) => {
  const requestTypes = createRequestTypes(`${moduleName}/${reducerName}`);
  const requestActions = createRequestActions(requestTypes);
  const reducer = createRequestReducerByKey({
    requestTypes,
    mapActionToKey,
    mapActionToPayload,
  });
  const modName = parentModuleName
    ? `${parentModuleName}.${moduleName}`
    : moduleName;
  const selector = (state: any) => get(state, `${modName}.${reducerName}`);
  return {
    requestTypes,
    requestActions,
    reducer,
    selector,
    reducerName,
  };
};
