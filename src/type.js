export type Action = {
  type: string,
  payload?: any,
  params?: Object,
  message?: any,
};

export type RequestTypes = {
  FETCH: string,
  INVALIDATE: string,
  INVALIDATE_ALL: string,
  CLEAR: string,
  CLEAR_ALL: string,
  REQUEST: string,
  SUCCESS: string,
  FAILURE: string,
};

export type FetchData = {
  isFetching: boolean,
  didInvalidate: boolean,
  payload: any,
};

export type RequestReducer = {
  requestTypes: RequestTypes,
  initialState: FetchData,
  mapActionToPayload?: Function,
};

export type RequestReducerByKey = {
  requestTypes: RequestTypes,
  mapActionToKey: Function,
  mapActionToPayload: Function,
};

export type RequestDucks = {
  moduleName: string,
  reducerName: string,
  mapActionToPayload?: Function,
  parentModuleName?: string,
};

export type RequestByKeyDucks = {
  moduleName: string,
  reducerName: string,
  mapActionToKey: Function,
  mapActionToPayload?: Function,
  parentModuleName?: string,
};

export type Ducks = {
  requestTypes: RequestTypes,
  requestActions: Object,
  selector: Function,
};

export type FetchIfNeededEpicParam = {
  ducks: Ducks,
  options?: Object,
};

export type FetchByKeyIfNeededEpicParam = {
  ducks: Ducks,
  mapActionToKey: Function,
  restoreFetchableKeyToAction?: Function,
  options?: Object,
};

export type RequestEpicParam = {
  ducks: Ducks,
  api: Function,
  options?: Object,
};

export type RequestByKeyEpicParam = {
  ducks: Ducks,
  api: Function,
  mapActionToKey: Function,
  restoreFetchableKeyToAction?: Function,
  options?: Object,
};
