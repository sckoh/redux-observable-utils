export const requestDefaultOptions = {
  cache: true,
  cacheDuration: 300,
  paging: false,
  handleParamsPromiseReject: true,
  handleParamsPromiseResolve: true,
  handlers: undefined,
};

export const config = {
  prefix: undefined,
  requestOptions: requestDefaultOptions,
};

export const configure = ({ prefix, requestOptions = {} } = {}) => {
  if (prefix) {
    config.prefix = prefix;
  }
  config.requestOptions = {
    ...requestDefaultOptions,
    ...requestOptions,
  };
};
