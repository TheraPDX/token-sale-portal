// imports
import httpStatus from 'http-status-codes';
import { find } from 'lodash';

// local imports
import {
  columns,
  event_type
} from '../model/consts'
import { toResponse } from '../lib/http-util';
import { createOrderedId, createId } from '../lib/uuid';
import { isNotValid } from '../lib/item-util';
import { loadCode } from '../lib/invite-codes-store';
import { saveToken } from '../lib/access-tokens-store';

// logging
import { createLogger } from 'bunyan';

const log = createLogger({ name: 'login-api' });

export function post(event, context, callback) {
  const request_id = createOrderedId();
  log.info({ request_id, event }, 'start');
  const request = JSON.parse(event.body) || {},
    invite_code = request[columns.invite_code];
  if (isNotValid(invite_code)) {
    const response = toResponse(httpStatus.BAD_REQUEST);
    log.warn({ request_id, response }, 'Failed to parse request params - end');
    return callback(null, response);
  }
  loadCode(invite_code)
    .then(item => {
      if (item) {
        const accessToken = {
          access_token_id: createId(),
          user_id: item.user_id,
          timestamp: new Date().toISOString(),
        }
        return saveToken(accessToken);
      } else {
        const response = toResponse(httpStatus.NOT_FOUND);
        log.warn({ request_id, response }, 'Failed to locate invite code - end');
        return callback(null, response);
      }
    })
    .then(accessToken => {
      if (accessToken) {
        const body = { access_token_id: accessToken.access_token_id };
        const response = toResponse(httpStatus.CREATED, body);
        log.info({ request_id, http_response: response }, 'success - end');
        return callback(null, response);
      } else {
        const response = toResponse(httpStatus.INTERNAL_SERVER_ERROR);
        log.error({ request_id, result, http_response: response }, 'Failed to process request - end');
        return callback(null, response);
      }
    })
    .catch(error => {
      const response = toResponse(httpStatus.INTERNAL_SERVER_ERROR);
      log.error({ request_id, error, http_response: response }, 'Failed to process request - end');
      return callback(null, response);
    });
};
