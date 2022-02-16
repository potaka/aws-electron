import * as React from 'react';
import {
  Button, Col, Container, Row,
} from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.css';
import './profileList.css';
import './mfaBox.css';
import { mfaRows } from './getRoleData';

import {
  LaunchButton,
  LaunchButtonGeneratorArguments,
  MfaRowArguments,

} from './types';

const { backend } = window; // defined in preload.js

interface MfaCacheState {
    mfaCode: string,
    config?: any, // TODO not any
}

class MfaCache extends React.Component<Record<string, never>, MfaCacheState> {
  constructor(props: Record<string, never>) {
    super(props);

    this.state = {
      mfaCode: '',
    };
  }

  componentDidMount(): void {
    void backend.getAWSConfig().then(
      (config) => backend.getMfaProfiles({ config }),
    ).then(
      (config) => this.setState({ config }),
    );
  }

  // TODO component
  mfaButtonGenerator({
    launchProfile, shouldDisable,
  }: LaunchButtonGeneratorArguments): LaunchButton {
    return function (buttonText?: string): Button {
      return (
        <Button
          onClick={launchProfile}
          disabled={shouldDisable}
          title={(shouldDisable
            ? 'Enter your 6-digit MFA code first!' : undefined)}
        >
          {buttonText || 'MFA'}
        </Button>
      );
    };
  }

  // TODO component
  mfaRow({
    profileName,
    profile,
    mfaButton,
  }: MfaRowArguments): Row {
    return (
      <Row className="d-table-row" key={profileName}>
        <Col className="d-none d-sm-table-cell" sm={2} md={3}>
          {profileName.replace(/-/g, String.fromCharCode(0x2011))}
        </Col>
        <Col className="d-none d-lg-table-cell" lg={2}>
          {(profile.mfa_serial
            ? profile.mfa_serial.replace(/arn:aws:iam::/, '') : '')}
        </Col>
        <Col className="d-none d-sm-table-cell launchButton" sm={2} md={2}>
          {mfaButton()}
        </Col>
      </Row>
    );
  }

  render(): React.Component {
    const {
      config,
      mfaCode,
    } = this.state;
    if (!config) {
      return <>Loading...</>;
    }

    return (
      <>
        <Container fluid>
          <Row className="d-none d-sm-table-row">
            <Col className="d-none d-sm-table-cell" sm={2} md={3}>
              <b>Profile Name</b>
            </Col>
            <Col className="d-none d-lg-table-cell" lg={2}>
              <b>MFA ARN or Serial Number</b>
            </Col>
            <Col className="d-none d-md-table-cell" md={2}>
              <b>Credentials Profile</b>
            </Col>
          </Row>
          {mfaRows({
            config,
            mfaCode,
            clearMfaCode: () => this.setState({ mfaCode: '' }),
            doMfa: backend.doMfa,
            mfaButtonGenerator: this.mfaButtonGenerator,
            mfaRowGenerator: this.mfaRow,
          })}
          <Row className="mfaBox">
            <Col>
              <input
                type="text"
                value={mfaCode}
                placeholder="MFA Code"
                onChange={(
                  event: any, // TODO not any
                ) => this.setState({ mfaCode: event.target.value })}
              />
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default MfaCache;