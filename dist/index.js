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
        this.options = Object.assign({ urlServices: 'http://localhost:8102/services/json', urlTopicData: 'ws://localhost:8104/topicdata', topicCurrentPose: '/avatar/current_pose/list', useDevicePrefixCurrentPose: true, topicVelocities: '/avatar/target_velocities', useDevicePrefixVelocities: true, publishIntervalMs: 30, onVelocitiesReceived: () => { }, currentPoseInput: () => this.defaultPoseInput(), onCurrentPosePublished: () => { }, configureInstance: true, skipUbii: false }, options);
        if (this.options.skipUbii) {
            this.start();
            return;
        }
        ubii_node_webbrowser_1.UbiiClientService.instance.on(ubii_node_webbrowser_1.UbiiClientService.EVENTS.CONNECT, () => {
            this.start();
        });
        ubii_node_webbrowser_1.UbiiClientService.instance.on(ubii_node_webbrowser_1.UbiiClientService.EVENTS.DISCONNECT, () => {
            this.started = false;
        });
        if (this.options.configureInstance) {
            ubii_node_webbrowser_1.UbiiClientService.instance.setHTTPS(window.location.protocol.includes('https'));
            ubii_node_webbrowser_1.UbiiClientService.instance.setName('Physical Embodiment');
        }
        ubii_node_webbrowser_1.UbiiClientService.instance.connect(this.options.urlServices, this.options.urlTopicData);
    }
    /**
     * This function is called from the constructor after the connection to
     * the Ubi-Interact master node is established.
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.started) {
                return;
            }
            this.started = true;
            yield this.createUbiiSpecs();
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
    /**
     * Main loop, which retrieves the pose from the input function,
     * sends them via Ubi-Interact, calls onCurrentPosePublished
     * and repeats after the given interval
     * @param i Index, starting at 0 and adding 1 at every iteration
     */
    publishLoop(i = 0) {
        var _a;
        if (!this.started) {
            return;
        }
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
    /**
     * Function that is called when velocity data is received. Can also, in
     * debugging cases, be called manually.
     * @param targets positions and rotations of all elements
     * @returns
     */
    onVelocityReceived(targets) {
        if (!targets.elements || !targets.elements.length) {
            //console.error('Received velocities do not contain data');
            return;
        }
        this.options.onVelocitiesReceived(targets.elements);
        this.targets = targets.elements;
    }
    /**
     * Sets {ubiiDevice} and the components {ubiiComponentCurrentPose} and
     * {ubiiComponentVelocity}
     */
    createUbiiSpecs() {
        return __awaiter(this, void 0, void 0, function* () {
            const clientId = ubii_node_webbrowser_1.UbiiClientService.instance.getClientID();
            const deviceName = 'web-forces-applier';
            const prefix = `/${clientId}/${deviceName}`;
            this.ubiiDevice = {
                clientId,
                name: deviceName,
                deviceType: protobuf_1.default.ubii.devices.Device.DeviceType.PARTICIPANT,
                components: [
                    {
                        name: 'Web Physical Avatar - Current Position and Orientation',
                        description: 'Publishes current avatars bone poses as Object3DList. Object3D.id will be one of UnityEngine.HumanBodyBones. Position and Quaternion also set reflecting current Rigidbody transform.',
                        tags: ['avatar', 'bones', 'pose', 'position', 'orientation', 'quaternion'],
                        ioType: protobuf_1.default.ubii.devices.Component.IOType.PUBLISHER,
                        topic: `${this.options.useDevicePrefixCurrentPose ? prefix : ''}${this.options.topicCurrentPose}`,
                        messageFormat: 'ubii.dataStructure.Object3DList',
                    },
                    {
                        name: 'Web Physical Avatar - Apply Velocities',
                        description: 'Allows to apply linear and angular velocities by publishing an Object3DList to this components topic. Object3D elements field "id" should be bone string equaling one of UnityEngine.HumanBodyBones. Object3D.Pose.Position equals linear velocity and Object3D.Pose.Euler equals angular velocity to be applied.',
                        tags: ['avatar', 'bones', 'control', 'velocity', 'linear', 'angular'],
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
        });
    }
    /**
     * Disconnects Ubi Interact
     */
    stop() {
        if (!this.started || this.options.skipUbii) {
            return;
        }
        ubii_node_webbrowser_1.UbiiClientService.instance.disconnect();
    }
}
exports.Applier = Applier;
