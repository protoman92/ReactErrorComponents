import { Observable, Observer, Subscription } from 'rxjs';
import { Nullable, Try } from 'javascriptutilities';
import { State as S } from 'type-safe-state-js';
import { DispatchReducer, ReduxStore as Store } from 'reactive-rx-redux-js';
import { MVVM } from 'react-base-utilities-js';
import * as Base from './base';

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
    store: Store.Dispatch.Self;
  }
}

export namespace ViewModel {
  /**
   * Dispatch store-based view model.
   * @extends {Base.ViewModel.DisplayType} Base view model extension.
   */
  export interface Type extends Base.ViewModel.DisplayType {}

  /**
   * Use this class to handle operation errors.
   * @implements {Type} Type implementation.
   */
  export class Self implements Type {
    private readonly provider: Provider.Type;
    private readonly subscription: Subscription;
    private readonly baseVM: Base.ViewModel.DisplayType;

    public get screen(): Nullable<MVVM.Navigation.Screen.Type> {
      return this.baseVM.screen;
    }

    public constructor(provider: Provider.Type) {
      this.provider = provider;
      this.subscription = new Subscription();
      this.baseVM = new Base.ViewModel.Self(provider);
    }

    public initialize = (): void => {
      let params: Base.ViewModel.InitializableParamsType = {
        provider: this.provider,
        viewModel: this,
        subscription: this.subscription,
      };

      Base.ViewModel.initialize(params);
    }

    public deinitialize = (): void => {
      this.subscription.unsubscribe();
    }

    public stateStream = (): Observable<Try<S.Self<any>>> => {
      return this.baseVM.stateStream();
    }

    public operationErrorTrigger = (): Observer<Nullable<Error>> => {
      let actionFn = this.provider.action.error.createUpdateAction;
      return this.provider.store.actionTrigger().mapObserver(v => actionFn(v));
    }

    public operationErrorStream = (): Observable<Try<Error>> => {
      return this.baseVM.operationErrorStream();
    }

    public errorForState = (state: Readonly<Nullable<S.Self<any>>>): Try<Error> => {
      return this.baseVM.errorForState(state);
    }
  }
}