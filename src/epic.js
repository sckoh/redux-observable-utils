// @flow

import 'rxjs';
import moment from 'moment';
import get from 'lodash/get';
import isArray from 'lodash/isArray';
import { combineEpics } from 'redux-observable';
import { Observable } from 'rxjs/Observable';
import type {
  Ducks,
  RequestEpicParam,
  RequestByKeyEpicParam,
  FetchIfNeededEpicParam,
  FetchByKeyIfNeededEpicParam,
} from './type';

/*

*/

/* LOGIC
1. isFetching -> false
2. lastUpdate > cacheDuration -> true
3. paging && itemsEnd -> false
4. !cache -> true
5. paging && fresh && payload !== undefined -> false
6. paging && !paginationFetch.page -> true
7. payload === undefined -> true
8. didInvalidate
*/

const shouldFetchPageIfNeeded = (
  state: Object,
  options: Object,
  action: Object,
) => {
  const lastUpdated = moment(state.lastUpdated);
  if (
    lastUpdated.isValid() &&
    lastUpdated.add(options.cacheDuration, 'seconds').isBefore(moment())
  ) {
    action.params.page = 0; // reset page if data expired
    return true;
  }
  if (state.itemsEnd) {
    return false;
  }
  if (action.params.fresh && state.payload !== undefined) {
    return false;
  }
  if (!get(state, `paginationFetched.${state.page}`)) {
    return true;
  }
  if (state.payload === undefined) {
    return true;
  }
  return state.didInvalidate;
};

const shouldFetchIfNeeded = (
  state: Object,
  options: Object,
  action: Object,
) => {
  if (!state) {
    return true;
  }
  if (state.isFetching) {
    return false;
  }
  if (options.paging) {
    return shouldFetchPageIfNeeded(state, options, action);
  }
  if (!options.cache) {
    return true;
  }
  const lastUpdated = moment(state.lastUpdated);
  if (
    lastUpdated.isValid() &&
    lastUpdated.add(options.cacheDuration, 'seconds').isBefore(moment())
  ) {
    return true;
  }
  if (state.payload === undefined) {
    return true;
  }
  return state.didInvalidate;
};

export const getShouldFetchKeys = (
  state: any,
  keys: any,
  options: Object,
  action: Object,
) => {
  if (keys && keys.constructor === Array) {
    const shouldFetchKeys = [];
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (shouldFetchIfNeeded(state[key], options, action)) {
        shouldFetchKeys.push(key);
      }
    }
    return shouldFetchKeys;
  }
  if (shouldFetchIfNeeded(state[keys], options, action)) {
    return keys;
  }
  return undefined;
};

const defaultOptions = {
  cache: true,
  cacheDuration: 300,
  paging: false,
  handleParamsPromiseReject: true,
  handleParamsPromiseResolve: true,
};

export const createFetchIfNeededEpic = ({
  ducks,
  options,
}: FetchIfNeededEpicParam) => {
  const { requestTypes, requestActions, selector } = ducks;
  return (action$: any, store: any) =>
    action$
      .ofType(requestTypes.FETCH)
      .filter(action =>
        shouldFetchIfNeeded(selector(store.getState()), options, action),
      )
      .map(action =>
        requestActions.request({
          ...action.params,
          page: get(selector(store.getState()), 'page'),
        }),
      );
};

const shouldContinueFetch = (shouldFetchKeys) => {
  if (shouldFetchKeys && shouldFetchKeys.constructor === Array) {
    return shouldFetchKeys.length;
  }
  return !!shouldFetchKeys;
};

export const createFetchByKeyIfNeededEpic = ({
  ducks,
  mapActionToKey,
  restoreFetchableKeyToAction,
  options,
}: FetchByKeyIfNeededEpicParam) => {
  const { requestTypes, requestActions, selector } = ducks;
  return (action$: any, store: any) =>
    action$
      .ofType(requestTypes.FETCH)
      .map((_action) => {
        const action = {
          ..._action,
        };
        const keys = mapActionToKey(action);
        const shouldFetchKeys = getShouldFetchKeys(
          selector(store.getState()),
          keys,
          options,
          action,
        );
        if (shouldContinueFetch(shouldFetchKeys)) {
          if (restoreFetchableKeyToAction) {
            restoreFetchableKeyToAction(action, shouldFetchKeys);
          }
          action.shouldFetch = true;
        }
        return action;
      })
      .filter(action => action.shouldFetch)
      .map((action) => {
        if (get(options, 'paging')) {
          const result = get(
            selector(store.getState()),
            mapActionToKey(action),
          );
          const page = get(result, 'page') || 0;
          return requestActions.request({
            ...action.params,
            page,
          });
        }
        return requestActions.request(action.params);
      });
};

export const createRequestEpic = ({
  ducks,
  api,
  options,
}: RequestEpicParam) => {
  const { requestTypes, requestActions } = ducks;
  return (action$: any, store: any) =>
    action$.ofType(requestTypes.REQUEST).mergeMap(action =>
      Observable.fromPromise(api(action.params, store))
        .map((data) => {
          if (
            get(action, 'params.resolve') && options.handleParamsPromiseResolve
          ) {
            action.params.resolve();
          }
          return requestActions.success(data, action.params);
        })
        .catch((error) => {
          console.error(error);
          console.error(JSON.stringify(error));
          if (
            get(action, 'params.reject') && options.handleParamsPromiseReject
          ) {
            action.params.reject();
          }
          return Observable.of(requestActions.failure(error, action.params));
        }),
    );
};

export const createRequestIfNeededEpic = ({
  ducks,
  api,
  options,
}: RequestEpicParam) => {
  const mergeOptions = {
    ...defaultOptions,
    ...options,
  };
  const fetchItemsIfNeededEpic = createFetchIfNeededEpic({
    ducks,
    options: mergeOptions,
  });
  const requestEpic = createRequestEpic({ ducks, api, options: mergeOptions });
  return combineEpics(fetchItemsIfNeededEpic, requestEpic);
};

export const createRequestByKeyIfNeededEpic = ({
  ducks,
  api,
  mapActionToKey,
  restoreFetchableKeyToAction,
  options = defaultOptions,
}: RequestByKeyEpicParam) => {
  const mergeOptions = {
    ...defaultOptions,
    ...options,
  };
  const fetchByKeyIfNeededEpic = createFetchByKeyIfNeededEpic({
    ducks,
    mapActionToKey,
    restoreFetchableKeyToAction,
    options: mergeOptions,
  });
  const requestEpic = createRequestEpic({ ducks, api, options: mergeOptions });
  return combineEpics(fetchByKeyIfNeededEpic, requestEpic);
};

type CacheEvictProps = {
  conditionType: Array<string> | string,
  ducks: Ducks,
  filter?: Function
};

export const createCacheEvictEpic = ({
  conditionType,
  ducks,
  filter,
}: CacheEvictProps) => (action$: any, store: any) =>
  action$
    .filter((action) => {
      if (action.type === conditionType) {
        return true;
      }
      return isArray(conditionType) && conditionType.indexOf(action.type) > -1;
    })
    .filter(() => {
      if (filter) {
        return filter(store.getState());
      }
      return get(ducks.selector(store.getState()), 'payload') !== undefined;
    })
    .mergeMap(() =>
      Observable.of(
        ducks.requestActions.clear(),
        ducks.requestActions.request(),
      ),
    );
