import { Observable, Subscription } from 'rxjs'; 
import { Numbers } from 'javascriptutilities';
import { Strings } from 'javascriptutilities/dist/src/string';
import { ReduxStore } from 'reactiveredux-js';
import { ErrorDisplay } from './../src';

let timeout = 1000;
let constants: ErrorDisplay.Base.Constants.Type = { displayDuration: 0 };
type ViewModel = ErrorDisplay.Base.ViewModel.DisplayType;

describe('Error view model should be implemented correctly', () => {
  var dispatchStore: ReduxStore.Dispatch.Self;
  var rxStore: ReduxStore.Rx.Self;
  var dispatchProvider: ErrorDisplay.Dispatch.Provider.Type;
  var rxProvider: ErrorDisplay.Rx.Provider.Type;
  var dispatchVM: ErrorDisplay.Dispatch.ViewModel.Type;
  var rxVM: ErrorDisplay.Rx.ViewModel.Type;

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
    dispatchVM = new ErrorDisplay.Dispatch.ViewModel.Self(dispatchProvider);
    rxVM = new ErrorDisplay.Rx.ViewModel.Self(rxProvider);
  });

  let testErrorViewModel = (viewModel: ViewModel, done: Function) => {
    /// Setup
    let waitTime = 0.1;
    let times = 100;
    let errors = Numbers.range(0, times).map(() => new Error(Strings.randomString(10)));
    let trigger = viewModel.operationErrorTrigger();
    var nullables: undefined[] = [];
    var errorResults: Error[] = [];

    viewModel.operationErrorStream()
      .doOnNext(v => v.value === undefined ? nullables.push(undefined) : {})
      .mapNonNilOrEmpty(v => v)
      .doOnNext(v => errorResults.push(v))
      .subscribe();

    // Also need to test that the view model automatically deletes the error
    // from global stream.
    viewModel.initialize();

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

  let testErrorDisplayable = (viewModel: ViewModel, done: Function) => {
    /// Setup
    let waitTime = 0.1;
    let times = 100;
    let errors = Numbers.range(0, times).map(() => new Error(Strings.randomString(10)));
    let trigger = viewModel.operationErrorTrigger();
    var nullables: undefined[] = [];
    var displayCount = 0;

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
    testErrorViewModel(dispatchVM, done);
  }, timeout);

  it('Rx error view model should work correctly', done => {
    testErrorViewModel(rxVM, done);
  }, timeout);

  it('Dispatch displayable should be implemented correctly', done => {
    testErrorDisplayable(dispatchVM, done);
  }, timeout);

  it('Rx displayable should be implemented correctly', done => {
    testErrorDisplayable(rxVM, done);
  }, timeout);
});