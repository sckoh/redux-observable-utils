export const config = {
  prefix: undefined,
};

export const configure = ({ prefix } = {}) => {
  if (prefix) {
    config.prefix = prefix;
  }
};
