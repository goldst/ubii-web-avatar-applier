import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import { UbiiClientService } from '@tum-far/ubii-node-webbrowser';
import { ApplierOptions } from './ApplierOptions';
import defaultPose from './defaultPose.json';

export class Applier {
    started = false;
    ubiiDevice?: Partial<ProtobufLibrary.ubii.devices.Device>;
    ubiiComponentCurrentPose?: ProtobufLibrary.ubii.devices.IComponent;
    ubiiComponentVelocity?: ProtobufLibrary.ubii.devices.IComponent;

    targets: ProtobufLibrary.ubii.dataStructure.IObject3D[] = [];

    options: ApplierOptions;

    constructor(options: Partial<ApplierOptions> = {}) {
        this.options = {
            urlServices: 'http://localhost:8102/services',
            urlTopicData: 'ws://localhost:8104/topicdata',
            topicCurrentPose: '/avatar/current_pose/list',
            useDevicePrefixCurrentPose: false,
            topicVelocities: '/avatar/target_velocities',
            useDevicePrefixVelocities: false,
            publishIntervalMs: 30,
            onVelocitiesReceived: () => {/*do nothing*/ },
            currentPoseInput: () => this.defaultPoseInput(),
            onCurrentPosePublished: () => {/*do nothing*/ },
            configureInstance: true,
            skipUbii: false,
            ...options
        };

        if (this.options.skipUbii) {
            this.start();
            return;
        }

        UbiiClientService.instance.on(UbiiClientService.EVENTS.CONNECT, () => {
            this.start();
        });

        UbiiClientService.instance.on(UbiiClientService.EVENTS.DISCONNECT, () => {
            this.stop();
        });

        if (this.options.configureInstance) {
            UbiiClientService.instance.setHTTPS(
                window.location.protocol.includes('https')
            );
            UbiiClientService.instance.setName('Physical Embodiment – Stage 1');
            UbiiClientService.instance.setPublishIntervalMs(this.options.publishIntervalMs);
        }

        UbiiClientService.instance.connect(this.options.urlServices, this.options.urlTopicData);
    }

    async start() {
        if (this.started) {
            return;
        }
        this.started = true;

        this.createUbiiSpecs();

        if(
            !this.ubiiDevice ||
            !this.ubiiComponentVelocity
        ) {
            return;
        }

        if (!this.options.skipUbii) {
            const replyRegisterDevice = await UbiiClientService.instance.registerDevice(this.ubiiDevice);

            if (replyRegisterDevice.id) {
                this.ubiiDevice = replyRegisterDevice;
            } else {
                console.error(
                    'Device registration failed. Ubi Interact replied with:',
                    replyRegisterDevice
                );
                return;
            }

            await UbiiClientService.instance.subscribeTopic(
                this.ubiiComponentVelocity.topic,
                (v: ProtobufLibrary.ubii.dataStructure.IObject3DList) => this.onVelocityReceived(v)
            );
        }

        this.publishLoop();
    }


    /**
     * Default elementInput function that is used if no other function is
     * supplied. Returns a static standing pose.
     */
    defaultPoseInput() {
        return defaultPose;
    }

    publishLoop(i = 0) {
        if (!this.ubiiComponentCurrentPose?.topic) {
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
            UbiiClientService.instance.publishRecord(record);
        }

        this.options.onCurrentPosePublished(record);

        setTimeout(
            () => this.publishLoop(i + 1),
            this.options.publishIntervalMs
        );
    }

    onVelocityReceived(targets: ProtobufLibrary.ubii.dataStructure.IObject3DList) {
        if (!targets.elements || !targets.elements.length) {
            console.error('received velocities do not contain data');
            return;
        }

        this.options.onVelocitiesReceived(targets.elements);

        this.targets = targets.elements;
    }

    createUbiiSpecs() {
        const clientId = UbiiClientService.instance.getClientID();
        const deviceName = 'web-forces-applier';
        const prefix = `/${clientId}/${deviceName}`;

        this.ubiiDevice = {
            clientId,
            name: deviceName,
            deviceType: ProtobufLibrary.ubii.devices.Device.DeviceType.PARTICIPANT,
            components: [
                {
                    name: 'Current physical avatar pose',
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.PUBLISHER,
                    topic: `${this.options.useDevicePrefixCurrentPose ? prefix :  ''}${this.options.topicCurrentPose}`,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                },
                {
                    name: 'Velocities for physical avatar',
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.SUBSCRIBER,
                    topic: `${this.options.useDevicePrefixVelocities ? prefix :  ''}${this.options.topicVelocities}`,
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
        UbiiClientService.instance.disconnect();
    }
}