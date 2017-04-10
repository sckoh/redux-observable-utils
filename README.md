# redux-observable-utils

* [createRequestEpicDucks](#createrequestepicducks)
* [createRequestByKeyEpicDucks](#createrequestbykeyepicducks)

## Installation 

`npm install redux-utils`

## Usage 

### createRequestEpicDucks

used for simple api request

* params 
  * `moduleName: string` module name which use to nest reducer in redux store
  * `reducerName: string` reducer name appeared in redux store
  * `api: Function` function that return promise to get your payload
  * `mapActionToPayload: Function` (optional) default is `(action) => action.payload`
  * `parentModuleName: string` (optional) parent module name which use to nest reducer in redux store
  * `options: Object` (optional) include fields:
    * `cache: boolean` set to false to disable cache. default is true
    * `cacheDuration: number` cache duration in millisecond. default is 300
    
* return
  * `ducks`
    * `requestTypes: Object` an object that includes redux types:
      * `FETCH` call api to fetch data, will check lastUpdated, didInvalidate, isFetching
      * `INVALIDATE` invalidate reducer so dispatching `FETCH` will call api again
      * `CLEAR` set reducer to initial state
      * `INVALIDATE_ALL` invalidate all keyed reducer so dispatching `FETCH` will call api again
      * `CLEAR_ALL` set all keyed reducer to initial state
      * `REQUEST` call api to request data, will not check lastUpdated, didInvalidate, isFetching
      * `SUCCESS` api success and set payload into reducer
      * `FAILURE` api failure and set error into reducer
    * `requestActions: Object` an object that includes redux actions:
      * `fetch` dispatch FETCH action
        * `params` pass params as object, eg: `fetch({ id: 1 })`
      * `invalidate` dispatch INVALIDATE action
      * `clear` dispatch CLEAR action
      * `invalidateAll` dispatch INVALIDATE_ALL action
      * `clearAll` dispatch CLEAR_ALL action
      * `request` dispatch REQUEST action
        * `params` pass params as object, eg: `fetch({ id: 1 })`
      * `success` dispatch SUCCESS action, is not called manually, it will be called after api call is success
        * `payload` data return by api call
        * `params` able to access params passed into fetch/request
      * `failure` dispatch FAILURE action, is not called manually, it will be called after api call is success
        * `params` able to access params passed into fetch/request
     * `reducer: Function` reducer function to be added into redux store
     * `selector: Function` selector function to get data from store
     * `reducerName: string` reducerName passed in 
  * `epic` epic function to be added into redux observable epic middleware
  
#### example: 

```javascript

{
  ducks: {
    requestTypes,
    requestActions,
    reducer,
    selector,
    reducerName,
  },
  epic,
}

```
  
#### usage example: 

```javascript

const todos = createRequestEpicDucks({
  moduleName: 'TODO',
  reducerName: 'TODOS',
  api: api.getTodos,
  mapActionToPayload: (action) => action.payload,
  parentModuleName: 'HOME',
  options: {
    cache: true,
    cacheDuration: 300,
  },
});

```

#### store example: 


action TODO/TODOS_FETCH dispatched: 

check for didInvalidate, isFetching, lastUpdated,

* if isFetching is true, REQUEST will not be dispatched
  * if lastUpdated is within cacheDuration, REQUEST will not be dispatched
    * if didInvalidate is false, REQUEST will not be dispatched

```javascript

TODO: Object
  TODOS: Object
    didInvalidate: false
    error: undefined
    isFetching: true
    payload: undefined

```

action TODO/TODOS_REQUEST dispatched:

```javascript

TODO: Object
  TODOS: Object
    didInvalidate: false
    error: undefined
    isFetching: true
    payload: undefined
  

```

action TODO/TODOS_SUCCESS dispatched:

```javascript

TODO: Object
  TODOS: Object
    didInvalidate: false
    error: undefined
    isFetching: false
    lastUpdated: Moment
    payload: 'data'
  

```


### createRequestByKeyEpicDucks

used for api request group by key

* params 
  * `moduleName: string` module name which use to nest reducer in redux store
  * `reducerName: string` reducer name appeared in redux store
  * `api: Function` function that return promise to get your payload
  * `mapActionToKey: Function` function that map action to request key
  * `mapActionToPayload: Function` (optional) default is `(action) => action.payload`
  * `parentModuleName: string` (optional) parent module name which use to nest reducer in redux store
  * `restoreFetchableKeyToAction: Function` function that map fetchable key back to action
  * `options: Object` (optional) include fields:
    * `cache: boolean` set to false to disable cache. default is true
    * `cacheDuration: number` cache duration in millisecond. default is 300
    
* return
  * `ducks`
    * `requestTypes: Object` same as in createRequestEpicDucks
    * `requestActions: Object` same as in createRequestEpicDucks
    * `reducer: Function` reducer function to be added into redux store
    * `selector: Function` selector function to get data from store
    * `reducerName: string` reducerName passed in 
  * `epic` epic function to be added into redux observable epic middleware
  
#### usage example: 

```javascript

const todos = createRequestByKeyEpicDucks({
  moduleName: 'TODO',
  reducerName: 'TODO',
  api: api.getTodos,
  mapActionToKey: (action) => action.params.todoId,
  mapActionToPayload: (action) => action.payload,
  parentModuleName: 'HOME',
  options: {
    cache: true,
    cacheDuration: 300,
  },
});

```

#### store example: 


```javascript

TODO: Object
  TODO: Object
    1: Object
      didInvalidate: false
      error: undefined
      isFetching: true
      payload: undefined
    2: Object
      didInvalidate: false
      error: undefined
      isFetching: true
      payload: undefined

// TODO object keys (1, 2) are todoId returned in mapActionToKey
```
