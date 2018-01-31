import { Observer, Observable, Subscription } from 'rxjs';
import { Nullable, Try } from 'javascriptutilities';
import { State as S, StateType } from 'type-safe-state-js';
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

export namespace Model {
  /**
   * Base model for an error view model. This model type only exposes minimal
   * functionalities so it can be implemented by other components' models.
   */
  export interface Type {
    operationErrorTrigger(): Observer<Nullable<Error>>;
    operationErrorStream(): Observable<Try<Error>>;
  }

  /**
   * Base display model for an error view model. This model should be to used if
   * we are using a standable error display component.
   *
   * The reason we have a separation between the base type and this type is that
   * we allow other components' models (which are interested in listening to
   * errors) to implement the base type - so that they are not required to
   * provide unnecessary functionalities.
   *
   * For those models, we initialize an error display model as an instance
   * property - this error display model should know how to access the error
   * stream/trigger. The owning models will then implement the base model type
   * methods by delegating to the error model.
   *
   * @extends {Type} Type extension.
   */
  export interface DisplayType extends Type {
    substatePath: Readonly<string>;
    errorForState(state: Readonly<Nullable<StateType<any>>>): Try<Error>;
  }

  /**
   * Provide a model for an error display component.
   */
  export interface ProviderType {
    errorDisplay_model(): Type;
  }

  /**
   * Base model for an error view model.
   * @implements {DisplayType} Type implementation.
   */
  export class Self implements DisplayType {
    private provider: Provider.Type;

    private get fullErrorValuePath(): string {
      return this.provider.action.error.fullErrorValuePath;
    }

    public get substatePath(): Readonly<string> {
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

    public operationErrorTrigger = (): Observer<Nullable<Error>> => {
      throw new Error(`Must override this for ${this}`);
    }

    public operationErrorStream = (): Observable<Try<Error>> => {
      let provider = this.provider;
      let path = this.fullErrorValuePath;
      let store = provider.store;

      return store.valueAtNode(path)
        .map(v => v.filter(
          v1 => v1 instanceof Error,
          v1 => `${v1} is not an Error`,
        ))
        .map(v => v.map(v1 => <Error>v1));
    }

    public errorForState = (state: Readonly<Nullable<StateType<any>>>): Try<Error> => {
      let path = this.fullErrorValuePath;

      return Try.unwrap(state)
        .map(v => S.fromKeyValue(v))
        .flatMap(v => v.valueAtNode(path))
        .filter(v => v instanceof Error, v => `${v} is not an Error`)
        .map(v => <Error>v);
    }
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
   * Provide view model for error display component.
   */
  export interface ProviderType {
    progressDisplay_viewModel(): ViewModel.Type;
  }

  /**
   * This is the view model that will be used by a standable error display
   * component. If the app using this view model has other ways of displaying
   * errors (e.g. by showing a pop-up), use Displayable instead.
   * @extends {MVVM.ViewModel.ReduxType} View model extension.
   * @extends {Type} Type extension.
   */
  export interface DisplayType extends MVVM.ViewModel.ReduxType, Type {
    errorForState(state: Readonly<Nullable<StateType<any>>>): Try<Error>;

    /**
     * This stream is used to delete errors from the global state once they
     * have been displayed.
     */
    initializeErrorDeletionStream(): void;
  }

  /**
   * Implementation of the base view model.
   * @implements {DisplayType} Display type implementation.
   */
  export class Self implements DisplayType {
    private readonly provider: Provider.Type;
    private readonly model: Model.DisplayType;
    private readonly subscription: Subscription;

    public get screen(): Nullable<MVVM.Navigation.Screen.BaseType> {
      return undefined;
    }

    public constructor(provider: Provider.Type, model: Model.DisplayType) {
      this.provider = provider;
      this.model = model;
      this.subscription = new Subscription();
    }

    /**
     * Beware that we should only call this method if we are using a dedicated
     * error display component.
     */
    public initializeErrorDeletionStream = (): void => {
      let provider = this.provider;
      let constants = provider.constants.error;

      /// Immediately delete the error from global state after it is displayed
      /// on screen.
      this.operationErrorStream()
        .mapNonNilOrEmpty(v => v)
        .map(() => undefined)
        .delay(constants.displayDuration)
        .subscribe(this.operationErrorTrigger())
        .toBeDisposedBy(this.subscription);
    }

    public initialize = (): void => {};
    public deinitialize = (): void => {};

    public stateStream = (): Observable<Try<S.Self<any>>> => {
      let provider = this.provider;
      let store = provider.store;
      let substatePath = this.model.substatePath;
      return store.stateStream().map(v => v.substateAtNode(substatePath));
    }

    public operationErrorTrigger = (): Observer<Nullable<Error>> => {
      return this.model.operationErrorTrigger();
    }

    public operationErrorStream = (): Observable<Try<Error>> => {
      return this.model.operationErrorStream();
    }

    public errorForState = (state: Readonly<Nullable<S.Self<any>>>): Try<Error> => {
      return this.model.errorForState(state);
    }
  }
}