// @flow

import 'rxjs';
import moment from 'moment';
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
};

export const createFetchIfNeededEpic = (
  {
    ducks,
    options = defaultOptions,
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
    options = defaultOptions,
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
  }: RequestEpicParam,
) => {
  const { requestTypes, requestActions } = ducks;
  return (action$: any, store: any) =>
    action$.ofType(requestTypes.REQUEST).mergeMap((action) => {
      console.log(Observable);
      console.log(Observable.fromPromise);
      return Observable.fromPromise(api(action.params, store))
        .map(data => requestActions.success(data, action.params))
        .catch((error) => {
          console.error(error);
          console.error(JSON.stringify(error));
          return Observable.of(requestActions.failure(null, action.params));
        });
    });
};

export const createRequestIfNeededEpic = (
  {
    ducks,
    api,
    options,
  }: RequestEpicParam,
) => {
  const fetchItemsIfNeededEpic = createFetchIfNeededEpic({
    ducks,
    options,
  });
  const requestEpic = createRequestEpic({ ducks, api });
  return combineEpics(fetchItemsIfNeededEpic, requestEpic);
};

export const createRequestByKeyIfNeededEpic = (
  {
    ducks,
    api,
    mapActionToKey,
    restoreFetchableKeyToAction,
    options,
  }: RequestByKeyEpicParam,
) => {
  const fetchByKeyIfNeededEpic = createFetchByKeyIfNeededEpic({
    ducks,
    mapActionToKey,
    restoreFetchableKeyToAction,
    options,
  });
  const { requestTypes, requestActions } = ducks;
  const requestEpic = createRequestEpic({ requestTypes, requestActions, api });
  return combineEpics(fetchByKeyIfNeededEpic, requestEpic);
};
