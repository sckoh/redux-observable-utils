// @flow

import 'rxjs';
import moment from 'moment';
import get from 'lodash/get';
import { combineEpics } from 'redux-observable';
import { Observable } from 'rxjs/Observable';
import type {
  RequestEpicParam,
  RequestByKeyEpicParam,
  FetchIfNeededEpicParam,
  FetchByKeyIfNeededEpicParam,
} from './type';

const shouldFetchIfNeeded = (state, options) => {
  if (!state) {
    return true;
  }
  if (state.isFetching) {
    return false;
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

export const getShouldFetchKeys = (state: any, keys: any, options: Object) => {
  if (keys && keys.constructor === Array) {
    const shouldFetchKeys = [];
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (shouldFetchIfNeeded(state[key], options)) {
        shouldFetchKeys.push(key);
      }
    }
    return shouldFetchKeys;
  }
  if (shouldFetchIfNeeded(state[keys], options)) {
    return keys;
  }
  return undefined;
};

const defaultOptions = {
  cache: true,
  cacheDuration: 300,
  handleParamsPromiseReject: true,
  handleParamsPromiseResolve: true,
};

export const createFetchIfNeededEpic = (
  {
    ducks,
    options,
  }: FetchIfNeededEpicParam,
) => {
  const { requestTypes, requestActions, selector } = ducks;
  return (action$: any, store: any) =>
    action$
      .ofType(requestTypes.FETCH)
      .filter(() => shouldFetchIfNeeded(selector(store.getState()), options))
      .map(action => requestActions.request(action.params));
};

const shouldContinueFetch = (shouldFetchKeys) => {
  if (shouldFetchKeys && shouldFetchKeys.constructor === Array) {
    return shouldFetchKeys.length;
  }
  return !!shouldFetchKeys;
};

export const createFetchByKeyIfNeededEpic = (
  {
    ducks,
    mapActionToKey,
    restoreFetchableKeyToAction,
    options,
  }: FetchByKeyIfNeededEpicParam,
) => {
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
      .map(action => requestActions.request(action.params));
};

export const createRequestEpic = (
  {
    ducks,
    api,
    options,
  }: RequestEpicParam,
) => {
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
          return Observable.of(requestActions.failure(null, action.params));
        }));
};

export const createRequestIfNeededEpic = (
  {
    ducks,
    api,
    options = defaultOptions,
  }: RequestEpicParam,
) => {
  const fetchItemsIfNeededEpic = createFetchIfNeededEpic({
    ducks,
    options,
  });
  const requestEpic = createRequestEpic({ ducks, api, options });
  return combineEpics(fetchItemsIfNeededEpic, requestEpic);
};

export const createRequestByKeyIfNeededEpic = (
  {
    ducks,
    api,
    mapActionToKey,
    restoreFetchableKeyToAction,
    options = defaultOptions,
  }: RequestByKeyEpicParam,
) => {
  const fetchByKeyIfNeededEpic = createFetchByKeyIfNeededEpic({
    ducks,
    mapActionToKey,
    restoreFetchableKeyToAction,
    options,
  });
  const requestEpic = createRequestEpic({ ducks, api, options });
  return combineEpics(fetchByKeyIfNeededEpic, requestEpic);
};
