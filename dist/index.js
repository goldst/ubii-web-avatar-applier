"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Applier = void 0;
const protobuf_1 = __importDefault(require("@tum-far/ubii-msg-formats/dist/js/protobuf"));
const ubii_node_webbrowser_1 = require("@tum-far/ubii-node-webbrowser");
const defaultPose_json_1 = __importDefault(require("./defaultPose.json"));
class Applier {
    constructor(options = {}) {
        this.started = false;
        this.targets = [];
        this.options = Object.assign({ urlServices: 'http://localhost:8102/services', urlTopicData: 'ws://localhost:8104/topicdata', topicCurrentPose: '/avatar/current_pose/list', useDevicePrefixCurrentPose: false, topicVelocities: '/avatar/target_velocities', useDevicePrefixVelocities: false, publishIntervalMs: 30, onVelocitiesReceived: () => { }, currentPoseInput: () => this.defaultPoseInput(), onCurrentPosePublished: () => { }, configureInstance: true, skipUbii: false }, options);
        if (this.options.skipUbii) {
            this.start();
            return;
        }
        ubii_node_webbrowser_1.UbiiClientService.instance.on(ubii_node_webbrowser_1.UbiiClientService.EVENTS.CONNECT, () => {
            this.start();
        });
        ubii_node_webbrowser_1.UbiiClientService.instance.on(ubii_node_webbrowser_1.UbiiClientService.EVENTS.DISCONNECT, () => {
            this.stop();
        });
        if (this.options.configureInstance) {
            ubii_node_webbrowser_1.UbiiClientService.instance.setHTTPS(window.location.protocol.includes('https'));
            ubii_node_webbrowser_1.UbiiClientService.instance.setName('Physical Embodiment – Stage 1');
            ubii_node_webbrowser_1.UbiiClientService.instance.setPublishIntervalMs(this.options.publishIntervalMs);
        }
        ubii_node_webbrowser_1.UbiiClientService.instance.connect(this.options.urlServices, this.options.urlTopicData);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.started) {
                return;
            }
            this.started = true;
            this.createUbiiSpecs();
            if (!this.ubiiDevice ||
                !this.ubiiComponentVelocity) {
                return;
            }
            if (!this.options.skipUbii) {
                const replyRegisterDevice = yield ubii_node_webbrowser_1.UbiiClientService.instance.registerDevice(this.ubiiDevice);
                if (replyRegisterDevice.id) {
                    this.ubiiDevice = replyRegisterDevice;
                }
                else {
                    console.error('Device registration failed. Ubi Interact replied with:', replyRegisterDevice);
                    return;
                }
                yield ubii_node_webbrowser_1.UbiiClientService.instance.subscribeTopic(this.ubiiComponentVelocity.topic, (v) => this.onVelocityReceived(v));
            }
            this.publishLoop();
        });
    }
    /**
     * Default elementInput function that is used if no other function is
     * supplied. Returns a static standing pose.
     */
    defaultPoseInput() {
        return defaultPose_json_1.default;
    }
    publishLoop(i = 0) {
        var _a;
        if (!((_a = this.ubiiComponentCurrentPose) === null || _a === void 0 ? void 0 : _a.topic)) {
            console.error('topic was not set');
            return;
        }
        const record = {
            topic: this.ubiiComponentCurrentPose.topic,
            object3DList: {
                elements: this.options.currentPoseInput(i)
            }
        };
        if (!this.options.skipUbii) {
            ubii_node_webbrowser_1.UbiiClientService.instance.publishRecord(record);
        }
        this.options.onCurrentPosePublished(record);
        setTimeout(() => this.publishLoop(i + 1), this.options.publishIntervalMs);
    }
    onVelocityReceived(targets) {
        if (!targets.elements || !targets.elements.length) {
            console.error('received velocities do not contain data');
            return;
        }
        this.options.onVelocitiesReceived(targets.elements);
        this.targets = targets.elements;
    }
    createUbiiSpecs() {
        const clientId = ubii_node_webbrowser_1.UbiiClientService.instance.getClientID();
        const deviceName = 'web-forces-applier';
        const prefix = `/${clientId}/${deviceName}`;
        this.ubiiDevice = {
            clientId,
            name: deviceName,
            deviceType: protobuf_1.default.ubii.devices.Device.DeviceType.PARTICIPANT,
            components: [
                {
                    name: 'Current physical avatar pose',
                    ioType: protobuf_1.default.ubii.devices.Component.IOType.PUBLISHER,
                    topic: `${this.options.useDevicePrefixCurrentPose ? prefix : ''}${this.options.topicCurrentPose}`,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                },
                {
                    name: 'Velocities for physical avatar',
                    ioType: protobuf_1.default.ubii.devices.Component.IOType.SUBSCRIBER,
                    topic: `${this.options.useDevicePrefixVelocities ? prefix : ''}${this.options.topicVelocities}`,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                }
            ],
        };
        [
            this.ubiiComponentCurrentPose,
            this.ubiiComponentVelocity,
        ]
            = this.ubiiDevice.components || [];
    }
    /**
     * Disconnects Ubi Interact
     */
    stop() {
        ubii_node_webbrowser_1.UbiiClientService.instance.disconnect();
    }
}
exports.Applier = Applier;
