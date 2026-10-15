const permissionDeniedText = 'permission denied';

type Err = {details?: string};

/** Determine if an error is a macaroon permission failure

  {
    [err]: {
      [details]: <gRPC Status Details String>
    }
  }

  @returns
  <Is Permission Denied Bool>
*/
export default ({err}: {err?: Err | null}) => {
  return String(err?.details).includes(permissionDeniedText);
};
