import { Transport } from '@nestjs/microservices';

export const SHAREPOINT_AUTH_MICROSERVICE = `SHAREPOINT_AUTH_MICROSERVICE`;
export const GET_AUTH_COMMAND = Object.freeze({ cmd: `get-auth` });
export const TRANSPORT = Transport.TCP;
