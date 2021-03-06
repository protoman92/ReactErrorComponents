import { Subscription } from 'rxjs';
import * as React from 'react';
import { Component, ReactNode } from 'react';
import { Try } from 'javascriptutilities';
import { State as S, StateType } from 'type-safe-state-js';
import * as Base from './../base';
import { Identity } from './Dependency';

export namespace Props {
  /**
   * Props type for error display component.
   */
  export interface Type {
    readonly identityProvider?: Identity.ProviderType;
    readonly viewModel: Base.ViewModel.DisplayType;

    /**
     * If we do not want to default error display component, we can manually
     * create a custom component with this.
     * @param {Try<Error>} error A Try Error instance.
     * @returns {ReactNode} A ReactNode instance.
     */
    displayComponent?(error: Try<Error>): ReactNode;
  }
}

/**
 * Error display component.
 * @extends {Component<Props.Type, StateType<any>>} Component extension.
 */
export class Self extends Component<Props.Type, StateType<any>> {
  private readonly viewModel: Base.ViewModel.DisplayType;
  private readonly subscription: Subscription;

  public constructor(props: Props.Type) {
    super(props);
    this.viewModel = props.viewModel;
    this.subscription = new Subscription();
  }

  public componentWillMount(): void {
    this.viewModel.initialize();

    this.viewModel.stateStream()
      .mapNonNilOrEmpty(v => v)
      .doOnNext(v => this.setState(v))
      .subscribe()
      .toBeDisposedBy(this.subscription);
  }

  public componentWillUnmount(): void {
    this.viewModel.deinitialize();
    this.subscription.unsubscribe();
  }

  private createDisplayComponent = (error: Try<Error>): ReactNode => {
    let props = this.props;

    if (props.displayComponent !== undefined) {
      return props.displayComponent(error);
    } else {
      return error.map(v => v.message).value;
    }
  }

  public render(): JSX.Element {
    let props = this.props;
    let viewModel = this.viewModel;
    let state = S.fromKeyValue(this.state);
    let error = viewModel.errorForState(state);
    let enabled = error.isSuccess();

    let identity = Try.unwrap(props.identityProvider)
      .flatMap(v => Try.unwrap(v.error))
      .getOrElse(() => Identity.createDefaultSelector());

    return <div {...identity.containerIdentity(enabled).value}>
      <div {...identity.identity(enabled).value}>
        {this.createDisplayComponent(error)}
      </div>
    </div>;
  }
}