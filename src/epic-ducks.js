// @flow

import { createRequestDucks, createRequestByKeyDucks } from './ducks';
import {
  createRequestIfNeededEpic,
  createRequestByKeyIfNeededEpic,
} from './epic';

export const createRequestEpicDucks = (
  {
    moduleName,
    reducerName,
    api,
    mapActionToPayload,
    parentModuleName,
    options,
  }: {
    moduleName: string,
    reducerName: string,
    api: Function,
    mapActionToPayload?: Function,
    parentModuleName?: string,
    options?: Object,
  },
) => {
  const ducks = createRequestDucks({
    moduleName,
    reducerName,
    mapActionToPayload,
    parentModuleName,
  });
  const epic = createRequestIfNeededEpic({
    ducks,
    api,
    options,
  });
  return {
    ducks,
    epic,
  };
};

export const createRequestByKeyEpicDucks = (
  {
    moduleName,
    reducerName,
    api,
    mapActionToKey,
    mapActionToPayload,
    parentModuleName,
    restoreFetchableKeyToAction,
    options,
  }: {
    moduleName: string,
    reducerName: string,
    api: Function,
    mapActionToKey: Function,
    mapActionToPayload?: Function,
    parentModuleName?: string,
    restoreFetchableKeyToAction?: Function,
    options?: Object,
  },
) => {
  const ducks = createRequestByKeyDucks({
    moduleName,
    reducerName,
    mapActionToKey,
    mapActionToPayload,
    parentModuleName,
  });
  const epic = createRequestByKeyIfNeededEpic({
    ducks,
    api,
    mapActionToKey,
    restoreFetchableKeyToAction,
    options,
  });
  return {
    ducks,
    epic,
  };
};
