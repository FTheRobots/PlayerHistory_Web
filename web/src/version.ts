declare const __APP_VERSION__: string;
declare const __APP_CODENAME__: string;

export const CLIENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export const CLIENT_CODENAME =
  typeof __APP_CODENAME__ !== 'undefined' && __APP_CODENAME__ ? __APP_CODENAME__ : '';

export const CLIENT_VERSION_HEADER = 'X-PlayerHistory-Client';
