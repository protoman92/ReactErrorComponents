import { BehaviorSubject, Observable, Observer, Subscription } from 'rxjs';
import { IncompletableSubject, Nullable, Try } from 'javascriptutilities';
import { State as S } from 'type-safe-state-js';
import { ReduxStore, RxReducer } from 'reactive-rx-redux-js';
import { MVVM } from 'react-base-utilities-js';
import * as Base from './base';

export namespace Action {
  /**
   * Provide an action that includes the error trigger.
   * @extends {Base.Action.Type} Base action extension.
   */
  export interface Type extends Base.Action.Type {
    operationErrorStream: Observable<Nullable<Error>>;
    operationErrorTrigger: Observer<Nullable<Error>>;
  }

  /**
   * Usually the top action will contain sub-namespace (such as action.login),
   * so we can let it implement this interface to provide the error action.
   * 
   * For example, the top action may look like:
   * 
   * {
   *    error: Action.ErrorType,
   *    login: Action.LoginType,
   *    register: Action.RegisterType,
   * }
   */
  export interface ProviderType {
    error: Type;
  }

  /**
   * Create default error action. The top action should provide this action with
   * 'error' namespace. We need a IncompletableSubject wrapper because this is
   * a global subject - otherwise, it may be prematurely terminated.
   */
  export let createDefault = (): Type => {
    let subject = new BehaviorSubject<Nullable<Error>>(undefined);
    let wrapper = new IncompletableSubject(subject);
    
    return {
      fullErrorValuePath: 'error.value',
      operationErrorStream: wrapper.asObservable(),
      operationErrorTrigger: wrapper,
    };
  };
}

export namespace Reducer {
  /**
   * Create default reducer for operation errors.
   * @param {Action.ProviderType} action Action provider.
   * @returns {Observable<RxReducer<Error>>} An Observable instance.
   */
  export let createDefault = (action: Action.ProviderType): Observable<RxReducer<Nullable<Error>>> => {
    let eAction = action.error;
    let path = eAction.fullErrorValuePath;
    let errorStream = eAction.operationErrorStream;

    return ReduxStore.Rx.createReducer(errorStream, (state, v) => {
      return state.updatingValue(path, v.value);
    });
  };
}

export namespace Provider {
  /**
   * Provide the relevant dependencies for this view model.
   * @extends {Base.Provider.Type} Base provider extension.
   */
  export interface Type extends Base.Provider.Type {
    action: Action.ProviderType;
  }
}

export namespace ViewModel {
  /**
   * Rx store-based view model.
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
      return this.provider.action.error.operationErrorTrigger;
    }

    public operationErrorStream = (): Observable<Try<Error>> => {
      return this.baseVM.operationErrorStream();
    }

    public errorForState = (state: Readonly<Nullable<S.Self<any>>>): Try<Error> => {
      return this.baseVM.errorForState(state);
    }
  }
}