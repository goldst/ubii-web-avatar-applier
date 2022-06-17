# ubii-web-avatar-applier
Ubi-Interact linear and angular velocities receiver for physical avatars and current pose publisher. This is a necessary step in physical embodiment scenarios, where users are represented virtually through a physical avatar.

## Usage
Ubii-web-avatar-applier can be used either as a standalone demo or as a node module in Your own applications.

## Prerequisites
This project communicates with a [Ubi-Interact master node](https://github.com/SandroWeber/ubii-node-master). Even though some of the functionality can be tested without it, it is recommended to have one.

To apply forces, this module receives linear and angular velocities from another Ubi-Interact component. It also publishes the resulting pose. [ubii-web-ik-force-computation](https://github.com/goldst/ubii-web-ik-force-computation) simplifies the process of publishing targets using abstractions similar to the ones in this module.

### Online Demo
The demo in this project is available at https://goldst.dev/ubii-web-avatar-applier/.

### Running the demo locally
After cloning, install, and run the project:
```bash
npm install
npm start
```
Your terminal will contain the demo URL, e.g. http://localhost:8080. Note that the command starts a development server which is not suitable for production environments.

### Using this project as a node module
To your existing node project, add the module:
```bash
npm i ubii-web-avatar-applier
```

You can either initialize the applier in HTML using the bundled version:
```html
<script src=".node_modules/ubii-web-avatar-applier/dist/bundle.js"></script>

<script>
    new UbiiWebAvatarApplier.Applier(options);
</script>
```

Or you can import it directly in your JavaScript/TypeScript project:
```js
import { Applier } from 'ubii-web-avatar-applier';

new Applier(options);
```

For available options, see [ApplierOptions.ts](./src/ApplierOptions.ts).

That's it! Other than supplying the options, no further configuration is necessary. If you want to stop the applier, just call `stop()` on the applier object.

## License
[MIT](LICENSE)
