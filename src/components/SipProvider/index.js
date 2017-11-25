import React from 'react';
import { bool, func, node, number, string } from 'prop-types';
import JsSIP from 'jssip';
import dummyLogger from '../../lib/dummyLogger';
import { callType, extraHeadersType, iceServersType, sipType } from '../../lib/types';

import {
  SIP_STATUS_DISCONNECTED,
  SIP_STATUS_CONNECTING,
  SIP_STATUS_CONNECTED,
  SIP_STATUS_REGISTERED,
  SIP_STATUS_ERROR,
  //
  SIP_ERROR_TYPE_CONFIGURATION,
  SIP_ERROR_TYPE_CONNECTION,
  SIP_ERROR_TYPE_REGISTRATION,
  //
  CALL_STATUS_IDLE,
  CALL_STATUS_STARTING,
  CALL_STATUS_ACTIVE,
  CALL_STATUS_STOPPING,
  //
  CALL_DIRECTION_INCOMING,
  CALL_DIRECTION_OUTGOING,
} from '../../lib/enums';

export default class SipProvider extends React.Component {
  static childContextTypes = {
    sip: sipType,
    call: callType,
    registerSip: func,
    unregisterSip: func,

    answerCall: func,
    startCall: func,
    stopCall: func,
  };

  static propTypes = {
    host: string,
    port: number,
    user: string,
    password: string,
    autoRegister: bool,
    autoAnswer: bool,
    sessionTimersExpires: number,
    extraHeaders: extraHeadersType,
    iceServers: iceServersType,
    debug: bool,

    children: node,
  };

  static defaultProps = {
    host: null,
    port: null,
    user: null,
    password: null,
    autoRegister: true,
    autoAnswer: false,
    sessionTimersExpires: 120,
    extraHeaders: { register: [], invite: [] },
    iceServers: [],
    debug: false,

    children: null,
  };

  constructor() {
    super();
    this.state = {
      sipStatus: SIP_STATUS_DISCONNECTED,
      sipErrorType: null,
      sipErrorMessage: null,

      rtcSession: null,
      // errorLog: [],
      callStatus: CALL_STATUS_IDLE,
      callDirection: null,
      callCounterpart: null,
    };

    this.ua = null;
  }

  getChildContext() {
    return {
      sip: {
        ...this.props,
        status: this.state.sipStatus,
        errorType: this.state.sipErrorType,
        errorMessage: this.state.sipErrorMessage,
      },
      call: {
        id: '??',
        status: this.state.callStatus,
        direction: this.state.callDirection,
        counterpart: this.state.callCounterpart,
      },
      registerSip: this.registerSip,
      unregisterSip: this.unregisterSip,

      answerCall: this.answerCall,
      startCall: this.startCall,
      stopCall: this.stopCall,
    };
  }

  componentDidMount() {
    // TODO check against having two instances of SipProvider in one app, which is not allowed

    this.remoteAudio = window.document.createElement('audio');
    window.document.body.appendChild(this.remoteAudio);

    this.reconfigureDebug();
    this.reinitializeJsSIP();
  }

  componentDidUpdate(prevProps) {
    if (this.props.debug !== prevProps.debug) {
      this.reconfigureDebug();
    }
    if (
      this.props.host !== prevProps.host ||
      this.props.port !== prevProps.port ||
      this.props.user !== prevProps.user ||
      this.props.password !== prevProps.password ||
      this.props.autoRegister !== prevProps.autoRegister
    ) {
      this.reinitializeJsSIP();
    }
  }

  componentWillUnmount() {
    delete this.remoteAudio;
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }
  }

  registerSip = () => {
    if (this.props.autoRegister) {
      throw new Error('Calling registerSip is not allowed when autoRegister === true');
    }
    if (this.state.sipStatus !== SIP_STATUS_CONNECTED) {
      throw new Error(`Calling registerSip is not allowed when sip status is ${this.state.sipStatus} (expected ${
        SIP_STATUS_CONNECTED
      })`);
    }
    return this.ua.register();
  };

  unregisterSip = () => {
    if (this.props.autoRegister) {
      throw new Error('Calling registerSip is not allowed when autoRegister === true');
    }
    if (this.state.sipStatus !== SIP_STATUS_REGISTERED) {
      throw new Error(`Calling unregisterSip is not allowed when sip status is ${
        this.state.sipStatus
      } (expected ${SIP_STATUS_CONNECTED})`);
    }
    return this.ua.unregister();
  };

  answerCall = () => {
    if (
      this.state.callStatus !== CALL_STATUS_STARTING ||
      this.state.callDirection !== CALL_DIRECTION_INCOMING
    ) {
      throw new Error(`Calling answerCall() is not allowed when call status is ${
        this.state.callStatus
      } and call direction is ${this.state.callDirection}  (expected ${
        CALL_STATUS_STARTING
      } and ${CALL_DIRECTION_INCOMING})`);
    }

    this.state.rtcSession.answer({
      mediaConstraints: {
        audio: true,
        video: false,
      },
      pcConfig: {
        iceServers: this.props.iceServers,
      },
    });
  };

  startCall = (destination) => {
    if (!destination) {
      throw new Error(`Destination must be defined (${destination} given)`);
    }
    if (
      this.state.sipStatus !== SIP_STATUS_CONNECTED &&
      this.state.sipStatus !== SIP_STATUS_REGISTERED
    ) {
      throw new Error(`Calling startCall() is not allowed when sip status is ${this.state.sipStatus} (expected ${
        SIP_STATUS_CONNECTED
      } or ${SIP_STATUS_REGISTERED})`);
    }

    if (this.state.callStatus !== CALL_STATUS_IDLE) {
      throw new Error(`Calling startCall() is not allowed when call status is ${
        this.state.callStatus
      } (expected ${CALL_STATUS_IDLE})`);
    }

    const { iceServers, sessionTimersExpires } = this.props;
    const extraHeaders = this.props.extraHeaders.invite;

    const options = {
      extraHeaders,
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers,
      },
      sessionTimersExpires,
    };

    this.ua.call(destination, options);
    this.setState({ callStatus: CALL_STATUS_STARTING });
  };

  stopCall = () => {
    this.setState({ callStatus: CALL_STATUS_STOPPING });
    this.ua.terminateSessions();
  };

  reconfigureDebug() {
    const { debug } = this.props;

    if (debug) {
      JsSIP.debug.enable('JsSIP:*');
      this.logger = console;
    } else {
      JsSIP.debug.disable('JsSIP:*');
      this.logger = dummyLogger;
    }
  }

  reinitializeJsSIP() {
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }

    const {
      host, port, user, password, autoRegister,
    } = this.props;

    if (!host || !port || !user) {
      this.setState({
        sipStatus: SIP_STATUS_DISCONNECTED,
        sipErrorType: null,
        sipErrorMessage: null,
      });
      return;
    }

    try {
      const socket = new JsSIP.WebSocketInterface(`wss://${host}:${port}`);
      this.ua = new JsSIP.UA({
        uri: `sip:${user}@${host}`,
        password,
        sockets: [socket],
        register: autoRegister,
      });
    } catch (error) {
      this.logger.debug('Error', error.message, error);
      this.onMount(function callback() {
        this.setState({
          sipStatus: SIP_STATUS_ERROR,
          sipErrorType: SIP_ERROR_TYPE_CONFIGURATION,
          sipErrorMessage: error.message,
        });
      });
      return;
    }

    const { ua } = this;
    ua.on('connecting', () => {
      this.logger.debug('UA "connecting" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_CONNECTING,
        sipErrorType: null,
        sipErrorMessage: null,
      });
    });

    ua.on('connected', () => {
      this.logger.debug('UA "connected" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_CONNECTED,
        sipErrorType: null,
        sipErrorMessage: null,
      });
    });

    ua.on('disconnected', () => {
      this.logger.debug('UA "disconnected" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_ERROR,
        sipErrorType: SIP_ERROR_TYPE_CONNECTION,
        sipErrorMessage: 'disconnected',
      });
    });

    ua.on('registered', (data) => {
      this.logger.debug('UA "registered" event', data);
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_REGISTERED,
        callStatus: CALL_STATUS_IDLE,
      });
    });

    ua.on('unregistered', () => {
      this.logger.debug('UA "unregistered" event');
      if (this.ua !== ua) {
        return;
      }
      if (ua.isConnected()) {
        this.setState({
          sipStatus: SIP_STATUS_CONNECTED,
          callStatus: null,
          callDirection: null,
        });
      } else {
        this.setState({
          sipStatus: SIP_STATUS_DISCONNECTED,
          callStatus: null,
          callDirection: null,
        });
      }
    });

    ua.on('registrationFailed', (data) => {
      this.logger.debug('UA "registrationFailed" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_ERROR,
        sipErrorType: SIP_ERROR_TYPE_REGISTRATION,
        sipErrorMessage: data,
      });
    });

    ua.on('newRTCSession', ({ originator, session: rtcSession, request: rtcRequest }) => {
      if (!this || this.ua !== ua) {
        return;
      }

      // identify call direction
      if (originator === 'local') {
        const foundUri = rtcRequest.to.toString();
        const delimiterPosition = foundUri.indexOf(';') || null;
        this.setState({
          callDirection: CALL_DIRECTION_OUTGOING,
          callStatus: CALL_STATUS_STARTING,
          callCounterpart: foundUri.substring(0, delimiterPosition) || foundUri,
        });
      } else if (originator === 'remote') {
        const foundUri = rtcRequest.from.toString();
        const delimiterPosition = foundUri.indexOf(';') || null;
        this.setState({
          callDirection: CALL_DIRECTION_INCOMING,
          callStatus: CALL_STATUS_STARTING,
          callCounterpart: foundUri.substring(0, delimiterPosition) || foundUri,
        });
      }

      const { rtcSession: rtcSessionInState } = this.state;

      // Avoid if busy or other incoming
      if (rtcSessionInState) {
        this.logger.debug('incoming call replied with 486 "Busy Here"');
        rtcSession.terminate({
          status_code: 486,
          reason_phrase: 'Busy Here',
        });
        return;
      }

      this.setState({ rtcSession });
      rtcSession.on('failed', () => {
        if (this.ua !== ua) {
          return;
        }

        this.setState({
          rtcSession: null,
          callStatus: CALL_STATUS_IDLE,
          callDirection: null,
          callCounterpart: null,
        });
      });

      rtcSession.on('ended', () => {
        if (this.ua !== ua) {
          return;
        }

        this.setState({
          rtcSession: null,
          callStatus: CALL_STATUS_IDLE,
          callDirection: null,
          callCounterpart: null,
        });
      });

      rtcSession.on('accepted', () => {
        if (this.ua !== ua) {
          return;
        }

        [this.remoteAudio.srcObject] = rtcSession.connection.getRemoteStreams();
        // const played = this.remoteAudio.play();
        const played = this.remoteAudio.play();

        if (typeof played !== 'undefined') {
          played.catch(() => {}).then(() => {
            setTimeout(() => {
              this.remoteAudio.play();
            }, 2000);
          });
          this.setState({ callStatus: CALL_STATUS_ACTIVE });
          return;
        }

        setTimeout(() => {
          this.remoteAudio.play();
        }, 2000);

        this.setState({ callStatus: CALL_STATUS_ACTIVE });
      });

      if (this.state.callDirection === CALL_DIRECTION_INCOMING && this.props.autoAnswer) {
        this.logger.log('Answer auto ON');
        this.answerCall();
      } else if (this.state.callDirection === CALL_DIRECTION_INCOMING && !this.props.autoAnswer) {
        this.logger.log('Answer auto OFF');
      } else if (this.state.callDirection === CALL_DIRECTION_OUTGOING) {
        this.logger.log('OUTGOING call');
      }
    });

    const extraHeadersRegister = this.props.extraHeaders.register || [];
    if (extraHeadersRegister.length) {
      ua.registrator().setExtraHeaders(extraHeadersRegister);
    }
    ua.start();
  }

  render() {
    return this.props.children;
  }
}
