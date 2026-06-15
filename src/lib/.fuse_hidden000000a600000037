export function isLocalAuthEnabled() {
  const override = process.env.ENABLE_LOCAL_AUTH;

  if (override === 'true') {
    return true;
  }

  if (override === 'false') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}
