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
    start(): Promise<void>;
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
    publishLoop(i?: number): void;
    onVelocityReceived(targets: ProtobufLibrary.ubii.dataStructure.IObject3DList): void;
    createUbiiSpecs(): void;
    /**
     * Disconnects Ubi Interact
     */
    stop(): void;
}
