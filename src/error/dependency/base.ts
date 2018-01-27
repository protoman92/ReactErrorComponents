import { Observer, Observable, Subscription } from 'rxjs';
import { Nullable, Try } from 'javascriptutilities';
import { State as S } from 'type-safe-state-js';
import { ReduxStore } from 'reactive-rx-redux-js';
import { MVVM } from 'react-base-utilities-js';

export namespace Action {
  /**
   * Base action for error display view model.
   */
  export interface Type {
    fullErrorValuePath: Readonly<string>;
  }

  /**
   * Provide action for an error display view model.
   */
  export interface ProviderType {
    error: Type;
  }
}

export namespace Constants {
  /**
   * Constants for error display component.
   */
  export interface Type {
    displayDuration: number;
  }

  /**
   * Provide constants for error display.
   */
  export interface ProviderType {
    error: Type;
  }
}

export namespace Provider {
  /**
   * Provide the relevant dependencies for this view model. This is the base
   * provider from which web/native providers will extend.
   * @extends {ReduxStore.Provider.Type} Store provider extension.
   */
  export interface Type extends ReduxStore.Provider.Type {
    action: Action.ProviderType;
    constants: Constants.ProviderType;
  }
}

export namespace ViewModel {
  /**
   * View model for operation errors. This is the generic version of the view
   * model for when the error display component is not used, so normal view
   * models can implement this interface to provide common stream/trigger for
   * errors.
   */
  export interface Type {
    operationErrorTrigger(): Observer<Nullable<Error>>;
    operationErrorStream(): Observable<Try<Error>>;
  }

  /**
   * This is the view model that can be used for error-display component. It
   * provides more specific functionalities.
   * @extends {MVVM.ViewModel.ReduxType} View model extension.
   * @extends {Type} Type extension.
   */
  export interface DisplayType extends MVVM.ViewModel.ReduxType, Type {
    errorForState(state: Readonly<Nullable<S.Self<any>>>): Try<Error>;
  }

  /**
   * Provides the necessary parameters for an initialize operation.
   */
  export interface InitializableParamsType {
    provider: Provider.Type;
    viewModel: DisplayType;
    subscription: Subscription;
  }

  /**
   * Provide view model for error display component.
   */
  export interface ProviderType {
    progressDisplay_viewModel(): ViewModel.DisplayType;
  }

  /**
   * Implementation of the base view model.
   * @implements {DisplayType} Display type implementation.
   */
  export class Self implements DisplayType {
    private provider: Provider.Type;

    public get screen(): Nullable<MVVM.Navigation.Screen.Type> {
      return undefined;
    }

    private get fullErrorValuePath(): string {
      return this.provider.action.error.fullErrorValuePath;
    }

    private get substatePath(): string {
      let provider = this.provider;
      let separator = provider.substateSeparator;
      let path = this.fullErrorValuePath;
      return S.separateSubstateAndValuePaths(path, separator)[0];
    }

    private get errorValuePath(): string {
      let provider = this.provider;
      let separator = provider.substateSeparator;
      let path = this.fullErrorValuePath;
      return S.separateSubstateAndValuePaths(path, separator)[1];
    }

    public constructor(provider: Provider.Type) {
      this.provider = provider;
    }

    public initialize = (): void => {};
    public deinitialize = (): void => {};

    public stateStream = (): Observable<Try<S.Self<any>>> => {
      let provider = this.provider;
      let store = provider.store;
      let substatePath = this.substatePath;
      return store.stateStream().map(v => v.substateAtNode(substatePath));
    }

    public operationErrorTrigger = (): Observer<Nullable<Error>> => {
      throw new Error(`Must override this for ${this}`);
    }

    public operationErrorStream = (): Observable<Try<Error>> => {
      let provider = this.provider;
      let path = this.fullErrorValuePath;
      let store = provider.store;

      return store.valueAtNode(path)
        .map(v => v.filter(v1 => v1 instanceof Error, `No error found at ${path}`))
        .map(v => v.map(v1 => <Error>v1));
    }

    public errorForState = (state: Readonly<Nullable<S.Self<any>>>): Try<Error> => {
      let path = this.fullErrorValuePath;

      return Try.unwrap(state)
        .flatMap(v => v.valueAtNode(path))
        .filter(v => v instanceof Error, `No error found at ${path}`)
        .map(v => <Error>v);
    }
  }

  /**
   * Common method to initialize an error view model.
   * @param {InitializableType} params A InitializeParamsType instance.
   */
  export let initialize = (params: InitializableParamsType): void => {
    let provider = params.provider;
    let constants = provider.constants.error;

    /// Immediately delete the error from global state after it is displayed
    /// on screen.
    params.viewModel.operationErrorStream()
      .mapNonNilOrEmpty(v => v)
      .map(() => undefined)
      .delay(constants.displayDuration)
      .subscribe(params.viewModel.operationErrorTrigger())
      .toBeDisposedBy(params.subscription);
  };
}