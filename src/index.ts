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
            urlServices: 'http://localhost:8102/services/json',
            urlTopicData: 'ws://localhost:8104/topicdata',
            topicCurrentPose: '/avatar/current_pose/list',
            useDevicePrefixCurrentPose: true,
            topicVelocities: '/avatar/target_velocities',
            useDevicePrefixVelocities: true,
            publishIntervalMs: 30,
            onVelocitiesReceived: () => { /*do nothing*/ },
            currentPoseInput: () => this.defaultPoseInput(),
            onCurrentPosePublished: () => { /*do nothing*/ },
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
            this.started = false;
        });

        if (this.options.configureInstance) {
            UbiiClientService.instance.setHTTPS(
                window.location.protocol.includes('https')
            );
            UbiiClientService.instance.setName('Physical Embodiment');
        }

        UbiiClientService.instance.connect(this.options.urlServices, this.options.urlTopicData);
    }

    /**
     * This function is called from the constructor after the connection to
     * the Ubi-Interact master node is established.
     */
    private async start() {
        if (this.started) {
            return;
        }
        this.started = true;

        await this.createUbiiSpecs();

        if (
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

    /**
     * Main loop, which retrieves the pose from the input function,
     * sends them via Ubi-Interact, calls onCurrentPosePublished
     * and repeats after the given interval
     * @param i Index, starting at 0 and adding 1 at every iteration
     */
    private publishLoop(i = 0) {
        if (!this.started) {
            return;
        }

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

    /**
     * Function that is called when velocity data is received. Can also, in
     * debugging cases, be called manually.
     * @param targets positions and rotations of all elements
     * @returns 
     */
    onVelocityReceived(targets: ProtobufLibrary.ubii.dataStructure.IObject3DList) {
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
    async createUbiiSpecs() {
        const clientId = UbiiClientService.instance.getClientID();
        const deviceName = 'web-forces-applier';
        const prefix = `/${clientId}/${deviceName}`;

        this.ubiiDevice = {
            clientId,
            name: deviceName,
            deviceType: ProtobufLibrary.ubii.devices.Device.DeviceType.PARTICIPANT,
            components: [
                {
                    name: 'Web Physical Avatar - Current Position and Orientation',
                    description: 'Publishes current avatars bone poses as Object3DList. Object3D.id will be one of UnityEngine.HumanBodyBones. Position and Quaternion also set reflecting current Rigidbody transform.',
                    tags: ['avatar', 'bones', 'pose', 'position', 'orientation', 'quaternion'],
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.PUBLISHER,
                    topic: `${this.options.useDevicePrefixCurrentPose ? prefix : ''}${this.options.topicCurrentPose}`,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                },
                {
                    name: 'Web Physical Avatar - Apply Velocities',
                    description: 'Allows to apply linear and angular velocities by publishing an Object3DList to this components topic. Object3D elements field "id" should be bone string equaling one of UnityEngine.HumanBodyBones. Object3D.Pose.Position equals linear velocity and Object3D.Pose.Euler equals angular velocity to be applied.',
                    tags: ['avatar', 'bones', 'control', 'velocity', 'linear', 'angular'],
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.SUBSCRIBER,
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
        if (!this.started || this.options.skipUbii) {
            return;
        }
        UbiiClientService.instance.disconnect();
    }
}