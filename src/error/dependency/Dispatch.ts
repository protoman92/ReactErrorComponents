import { Observable, Observer } from 'rxjs';
import { Nullable, Try } from 'javascriptutilities';
import { State as S } from 'type-safe-state-js';
import { DispatchReducer, ReduxStore as Store } from 'reactive-rx-redux-js';
import * as Base from './../base';

export namespace Action {
  export let UPDATE_ERROR_ACTION = 'UPDATE_ERROR_ACTION';

  /**
   * Provide actions for the dispatch store.
   * @extends {Base.Action.Type} Base action extension.
   */
  export interface CreatorType extends Base.Action.Type {
    createUpdateAction(error: Nullable<Error>): Store.Dispatch.Action.Type<Nullable<Error>>;
  }

  /**
   * Provide the action creator error namespace.
   */
  export interface ProviderType {
    error: CreatorType;
  }

  /**
   * Create default error action creator.
   */
  export let createDefault = (): CreatorType => {
    let fullErrorValuePath = 'error.value';

    return {
      fullErrorValuePath,
      createUpdateAction: (error: Nullable<Error>) => ({
        id: UPDATE_ERROR_ACTION,
        fullValuePath: fullErrorValuePath,
        payload: error,
      }),
    };
  };

  /**
   * Check if an action is an error action.
   * @param {ReduxStore.Dispatch.Action.Type<any>} action An Action instance.
   * @returns {boolean} A boolean value.
   */
  export function isInstance(action: Store.Dispatch.Action.Type<any>): boolean {
    switch (action.id) {
      case UPDATE_ERROR_ACTION: return true;
      default: return false;
    }
  }
}

export namespace Reducer {
  /**
   * Create default reducer for operation errors.
   * @returns {DispatchReducer<any>} A DispatchReducer instance.
   */
  export let createDefault = (): DispatchReducer<any> => {
    return (state: S.Self<any>, action: Store.Dispatch.Action.Type<any>) => {
      switch (action.id) {
        case Action.UPDATE_ERROR_ACTION:
          return state.updatingValue(action.fullValuePath, action.payload);

        default:
          return state;
      }
    };
  };
}

export namespace Provider {
  /**
   * Provide the relevant dependencies for this view model.
   * @extends {Base.Provider.Type} Base provider extension.
   */
  export interface Type extends Base.Provider.Type {
    action: Action.ProviderType;
    store: Store.Dispatch.Type;
  }
}

export namespace Model {
  /**
   * Dispatch store-based model.
   * @extends {Base.Model.DisplayType} Base model extension.
   */
  export interface Type extends Base.Model.DisplayType {}

  /**
   * Dispatch store-based model.
   * @implements {Type} Type implementation.
   */
  export class Self implements Type {
    private readonly provider: Provider.Type;
    private readonly baseModel: Base.Model.DisplayType;

    public get substatePath(): Readonly<string> {
      return this.baseModel.substatePath;
    }

    public constructor(provider: Provider.Type) {
      this.provider = provider;
      this.baseModel = new Base.Model.Self(provider);
    }

    public operationErrorTrigger = (): Observer<Nullable<Error>> => {
      let actionFn = this.provider.action.error.createUpdateAction;
      return this.provider.store.actionTrigger().mapObserver(v => actionFn(v));
    }

    public operationErrorStream = (): Observable<Try<Error>> => {
      return this.baseModel.operationErrorStream();
    }

    public errorForState = (state: Readonly<Nullable<S.Self<any>>>): Try<Error> => {
      return this.baseModel.errorForState(state);
    }
  }
}