
import { TheronAction } from '../../lib/action';
import { TheronExecutable } from '../../lib/executable';
import { WebSocketSubject } from '../../lib/websocket';

export class Router extends WebSocketSubject<TheronAction> {

}
