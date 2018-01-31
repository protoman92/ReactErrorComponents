import { Observable, Subscription } from 'rxjs';
import { Numbers } from 'javascriptutilities';
import { Strings } from 'javascriptutilities/dist/src/string';
import { ReduxStore } from 'reactive-rx-redux-js';
import { ErrorDisplay } from './../src';

let timeout = 1000;
let constants: ErrorDisplay.Base.Constants.Type = { displayDuration: 0 };
type Model = ErrorDisplay.Base.Model.DisplayType;
type Provider = ErrorDisplay.Base.Provider.Type;

describe('Error view model should be implemented correctly', () => {
  let dispatchStore: ReduxStore.Dispatch.Self;
  let rxStore: ReduxStore.Rx.Self;
  let dispatchProvider: ErrorDisplay.Dispatch.Provider.Type;
  let rxProvider: ErrorDisplay.Rx.Provider.Type;
  let dispatchModel: ErrorDisplay.Dispatch.Model.Type;
  let rxModel: ErrorDisplay.Rx.Model.Type;

  beforeEach(() => {
    let rxAction = ErrorDisplay.Rx.Action.createDefault();
    let rxActionProvider = { error: rxAction };
    let rxReducer = ErrorDisplay.Rx.Reducer.createDefault(rxActionProvider);
    let dispatchReducer = ErrorDisplay.Dispatch.Reducer.createDefault();
    dispatchStore = new ReduxStore.Dispatch.Self();
    rxStore = new ReduxStore.Rx.Self(rxReducer);

    dispatchProvider = {
      action: { error: ErrorDisplay.Dispatch.Action.createDefault() },
      constants: { error: constants },
      store: dispatchStore,
      substateSeparator: '.',
    };

    rxProvider = {
      action: rxActionProvider,
      constants: { error: constants },
      store: rxStore,
      substateSeparator: '.',
    };

    dispatchStore.initialize(dispatchReducer);
    dispatchModel = new ErrorDisplay.Dispatch.Model.Self(dispatchProvider);
    rxModel = new ErrorDisplay.Rx.Model.Self(rxProvider);
  });

  let testErrorViewModel = (provider: Provider, model: Model, done: Function) => {
    /// Setup
    let waitTime = 0.1;
    let times = 100;
    let errors = Numbers.range(0, times).map(() => new Error(Strings.randomString(10)));
    let viewModel = new ErrorDisplay.Base.ViewModel.Self(provider, model);
    let trigger = viewModel.operationErrorTrigger();
    let nullables: undefined[] = [];
    let errorResults: Error[] = [];

    viewModel.operationErrorStream()
      .doOnNext(v => v.value === undefined ? nullables.push(undefined) : {})
      .mapNonNilOrEmpty(v => v)
      .doOnNext(v => errorResults.push(v))
      .subscribe();

    // Also need to test that the view model automatically deletes the error
    // from global stream.
    viewModel.initializeErrorDeletionStream();

    /// When
    Observable.from(errors)
      .flatMap((v, i) => Observable.of(v)
        .delay(i * waitTime)
        .doOnNext(v1 => trigger.next(v1)))
      .toArray().delay(waitTime)
      .doOnNext(() => {
        expect(errorResults).toEqual(errors);
        expect(nullables.length).toBe(times + 1);
      })
      .doOnCompleted(() => done())
      .subscribe();
  };

  let testErrorDisplayable = (provider: Provider, model: Model, done: Function): void => {
    /// Setup
    let waitTime = 0.1;
    let times = 100;
    let errors = Numbers.range(0, times).map(() => new Error(Strings.randomString(10)));
    let viewModel = new ErrorDisplay.Base.ViewModel.Self(provider, model);
    let trigger = viewModel.operationErrorTrigger();
    let nullables: undefined[] = [];
    let displayCount = 0;

    let displayable: ErrorDisplay.Displayable.Type = {
      viewModel,
      displayErrorMessage: () => displayCount += 1,
      subscription: new Subscription(),
    };

    viewModel.operationErrorStream()
      .doOnNext(v => v.value === undefined ? nullables.push(undefined) : {})
      .subscribe();

    ErrorDisplay.Displayable.setupBindings(displayable);

    /// When
    Observable.from(errors)
      .flatMap((v, i) => Observable.of(v)
        .delay(i * waitTime)
        .doOnNext(v1 => trigger.next(v1)))
      .toArray().delay(waitTime)
      .doOnNext(() => {
        expect(displayCount).toBe(times);
        expect(nullables.length).toBe(times + 1);
      })
      .doOnCompleted(() => done())
      .subscribe();
  };

  it('Dispatch error view model should work correctly', done => {
    testErrorViewModel(dispatchProvider, dispatchModel, done);
  }, timeout);

  it('Rx error view model should work correctly', done => {
    testErrorViewModel(rxProvider, rxModel, done);
  }, timeout);

  it('Dispatch displayable should be implemented correctly', done => {
    testErrorDisplayable(dispatchProvider, dispatchModel, done);
  }, timeout);

  it('Rx displayable should be implemented correctly', done => {
    testErrorDisplayable(rxProvider, rxModel, done);
  }, timeout);
});