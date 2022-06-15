import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import { ApplierOptions } from './ApplierOptions';
export declare class Applier {
    started: boolean;
    ubiiDevice?: Partial<ProtobufLibrary.ubii.devices.Device>;
    ubiiComponentCurrentPose?: ProtobufLibrary.ubii.devices.IComponent;
    ubiiComponentVelocity?: ProtobufLibrary.ubii.devices.IComponent;
    targets: ProtobufLibrary.ubii.dataStructure.IObject3D[];
    options: ApplierOptions;
    constructor(options?: Partial<ApplierOptions>);
    /**
     * This function is called from the constructor after the connection to
     * the Ubi-Interact master node is established.
     */
    private start;
    /**
     * Default elementInput function that is used if no other function is
     * supplied. Returns a static standing pose.
     */
    defaultPoseInput(): {
        id: string;
        pose: {
            position: {
                x: number;
                y: number;
                z: number;
            };
            quaternion: {
                w: number;
                x: number;
                y: number;
                z: number;
            };
        };
    }[];
    /**
     * Main loop, which retrieves the pose from the input function,
     * sends them via Ubi-Interact, calls onCurrentPosePublished
     * and repeats after the given interval
     * @param i Index, starting at 0 and adding 1 at every iteration
     */
    private publishLoop;
    /**
     * Function that is called when velocity data is received. Can also, in
     * debugging cases, be called manually.
     * @param targets positions and rotations of all elements
     * @returns
     */
    onVelocityReceived(targets: ProtobufLibrary.ubii.dataStructure.IObject3DList): void;
    /**
     * Sets {ubiiDevice} and the components {ubiiComponentCurrentPose} and
     * {ubiiComponentVelocity}
     */
    createUbiiSpecs(): Promise<void>;
    /**
     * Disconnects Ubi Interact
     */
    stop(): void;
}
