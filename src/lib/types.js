import { arrayOf, bool, number, object, objectOf, shape, string } from 'prop-types';

export const extraHeadersType = objectOf(arrayOf(string));

export const iceServersType = arrayOf(object);

export const sipType = shape({
  status: string,
  errorType: string,
  errorMessage: string,

  host: string,
  port: number,
  user: string,
  password: string,
  autoRegister: bool,
  autoAnswer: bool,
  sessionTimersExpires: number,
  extraHeaders: extraHeadersType,
  iceServers: iceServersType,
  debug: bool,
});

export const callType = shape({
  id: string,
  status: string,
  direction: string,
  counterpart: string,
});
