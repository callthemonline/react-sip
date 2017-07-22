// import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import JsSIP from 'jssip';

import {
  SIP_STATUS_CONNECTED,
  SIP_STATUS_DISCONNECTED,
  SIP_STATUS_CONNECTING,
  SIP_STATUS_REGISTERED,
  SIP_STATUS_ERROR,
  CALL_STATUS_IDLE,
  CALL_STATUS_STARTING,
  CALL_STATUS_ACTIVE,
  CALL_STATUS_STOPPING,
  CALL_DIRECTION_INCOMING,
  CALL_DIRECTION_OUTGOING,
} from '../../lib/statuses';

let logger;
const dummyLogger = {};
dummyLogger.log = () => {};
dummyLogger.error = () => {};
dummyLogger.warn = () => {};
dummyLogger.debug = () => {};

const contactToSipIdRegex = /[a-zA-Z0-9]+@[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*/;

export default class SipProvider extends React.Component {

  static childContextTypes = {
    sipId: PropTypes.string,
    sipStatus: PropTypes.string,
    sipErrorLog: PropTypes.array,
    sipStart: PropTypes.func,
    sipStop: PropTypes.func,
    sipAnswer: PropTypes.func,
    rtcSessionExists: PropTypes.bool,
    callStatus: PropTypes.string,
    callDirection: PropTypes.string,
  }

  static defaultProps = {
    iceServers: [],
    debug: false,
    autoAnswer: false,
  }

  static propTypes = {
    host: PropTypes.string.isRequired,
    port: PropTypes.string.isRequired,
    user: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
    iceServers: PropTypes.array,
    debug: PropTypes.bool,
    autoAnswer: PropTypes.bool,
  }

  constructor() {
    super();
    this.state = {
      status: SIP_STATUS_DISCONNECTED,
      rtcSession: null,
      errorLog: [],
      callStatus: null,
      callDirection: null,
    };

    this.mounted = false;
    this.ua = null;
    // this.stopCall = this.stopCall.bind(this);
  }

  answerCall = () => {
    if (!this.state.rtcSession) {
      throw new Error('Can\'t answer - no RTC session');
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
  }

  stopCall = () => { //call stop
    this.setState({ callStatus: CALL_STATUS_STOPPING });
    this.ua.terminateSessions();
    console.log('Answer auto OFF - inside the function');
  }

  startCall = (destination) => { //call start
    console.log(this);
    const {
      iceServers,
    } = this.props;

    var options = {
      extraHeaders: [ 'X-Token: foo', 'X-Bar: bar' ],
      'mediaConstraints': {'audio': true, 'video': false},
      pcConfig: {
        iceServers,
      },
      sessionTimersExpires: 120
    };

    this.ua.call(destination, options);
    this.setState({ callStatus: CALL_STATUS_STARTING });
  }

  getChildContext() {
    const contact = this.ua && this.ua.contact && this.ua.contact.toString();
    const sipIdRegexResult = contactToSipIdRegex.exec(contact);
    return {
      sipId: sipIdRegexResult ? sipIdRegexResult[0] : '',
      sipStatus: this.state.status,
      sipStart: this.startCall,
      sipStop: this.stopCall,
      sipAnswer: this.answerCall,
      rtcSessionExists: !!this.state.rtcSession,
      callStatus: this.state.callStatus,
      callDirection: this.state.callDirection,
    };
  }

  componentDidMount() {
    const {
      host,
      port,
      user,
      password,
      iceServers,
      debug,
      autoAnswer,
    } = this.props;


    // still requires page reloding after the setting has changed
    // http://jssip.net/documentation/3.0.x/api/debug/
    if (debug) {
      JsSIP.debug.enable('JsSIP:*');
      logger = console;
    } else {
      JsSIP.debug.disable('JsSIP:*');
      logger = dummyLogger;
    }



    this.remoteAudio = window.document.createElement('audio');
    window.document.body.appendChild(this.remoteAudio);

    this.mounted = true;
    const socket = new JsSIP.WebSocketInterface(`wss://${host}:${port}`);

    try {
      this.ua = new JsSIP.UA({
        uri: `sip:${user}@${host}`,
        password,
        sockets: [socket],
        //register: false,
      });
    } catch (error) {
      logger.debug('Error', error.message, error);
      this.onMount(function callback() {
        this.setState({
          status: SIP_STATUS_ERROR,
          errorLog: [...this.state.errorLog, {
            message: error.message,
            time: new Date(),
          }],
        });
      });
    }

    this.ua.on('connecting', () => {
      logger.debug('UA "connecting" event');
      if (!this.mounted) {
        return;
      }
      this.setState({
        status: SIP_STATUS_CONNECTING,
      });
    });

    this.ua.on('connected', () => {
      logger.debug('UA "connected" event');
      if (!this.mounted) {
        return;
      }
      this.setState({ status: SIP_STATUS_CONNECTED });
    });

    this.ua.on('disconnected', () => {
      logger.debug('UA "disconnected" event');
      if (!this.mounted) {
        return;
      }
      this.setState({ status: SIP_STATUS_DISCONNECTED });
    });

    this.ua.on('registered', (data) => {
      logger.debug('UA "registered" event', data);
      if (!this.mounted) {
        return;
      }
      this.setState({ status: SIP_STATUS_REGISTERED , callStatus: CALL_STATUS_IDLE});
    });

    this.ua.on('unregistered', () => {
      logger.debug('UA "unregistered" event');
      if (!this.mounted) {
        return;
      }
      if (this.ua.isConnected()) {
        this.setState({ status: SIP_STATUS_CONNECTED, callStatus: null, callDirection: null });
      } else {
        this.setState({ status: SIP_STATUS_DISCONNECTED, callStatus: null, callDirection: null });
      }
    });

    this.ua.on('registrationFailed', (data) => {
      logger.debug('UA "registrationFailed" event');
      if (!this.mounted) {
        return;
      }
      if (this.ua.isConnected()) {
        this.setState({ status: 'connected' });
      } else {
        this.setState({ status: 'disconnected' });
      }
      this.setState({
        status: this.ua.isConnected()
          ? SIP_STATUS_ONNECTED
          : SIP_STATUS_DISCONNECTED,
        errorLog: [...this.state.errorLog, {
          message: data.cause,
          time: new Date(),
        }],
      });
    });

    this.ua.on('newRTCSession', ({ originator, session: rtcSession, request}) => {
      console.log('DATA',{ originator, rtcSession, request});
      if (!this || !this.mounted) {
        return;
      }

      // identify call direction
      if (originator === 'local') {
        this.setState({ callDirection: CALL_DIRECTION_OUTGOING, callStatus: CALL_STATUS_STARTING });
      } else if (originator === 'remote') {
        this.setState({ callDirection: CALL_DIRECTION_INCOMING, callStatus: CALL_STATUS_STARTING });
      }

      const {
        rtcSession: rtcSessionInState,
      } = this.state;

      // Avoid if busy or other incoming
      if (rtcSessionInState) {
        logger.debug('incoming call replied with 486 "Busy Here"');
        rtcSession.terminate({
          status_code: 486,
          reason_phrase: 'Busy Here',
        });
        return;
      }

      this.setState({ rtcSession });
      rtcSession.on('failed', () => {
        if (!this.mounted) {
          return;
        }
        this.setState({
          rtcSession: null,
          callStatus: CALL_STATUS_IDLE,
          callDirection: null,
        });
      });

      rtcSession.on('ended', () => {
        if (!this.mounted) {
          return;
        }
        this.setState({
          rtcSession: null,
          callStatus: CALL_STATUS_IDLE,
          callDirection: null,
        });
      });

      rtcSession.on('accepted', () => {
        console.log('ACCEPTED');
        if (!this.mounted) {
          return;
        }

        this.remoteAudio.src = window.URL.createObjectURL(rtcSession.connection.getRemoteStreams()[0]);
        this.remoteAudio.play();
        this.setState({ callStatus: CALL_STATUS_ACTIVE });
      });

      if (this.state.callDirection === CALL_DIRECTION_INCOMING && autoAnswer) {
        console.log('Answer auto ON');
        this.answerCall();
      } else if (this.state.callDirection === CALL_DIRECTION_INCOMING && !autoAnswer) {
        console.log('Answer auto OFF');

      } else if (this.state.callDirection === CALL_DIRECTION_OUTGOING ) {
        console.log('OUTBOUND call');
      }

    });
    this.ua.start();
  }

  componentWillUnmount() {
    delete this.remoteAudio;
    this.mounted = false;
  }

  render() {
    return this.props.children;
  }
}
