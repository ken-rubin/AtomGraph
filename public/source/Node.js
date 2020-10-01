////////////////////////////////////
// Graph node.
//

// Define universal constants:
const HOOKE_CONSTANT = 10;
const COULOMB_CONSTANT = 10;
const DRAG_CONSTANT = 0.01;
const ANIMATION_SPEED_CONSTANT = 0.1;
const MAXIMUM_VA = 100.0;

class Node {

    // Construct node.
    constructor(name) {

        this.name = name;
    }

    // Render the node to the context.
    render(context, nodeBasis) {

        // Draw a circle.
        context.moveTo(this.position.x - nodeBasis.position.x,
            this.position.y - nodeBasis.position.y);
        context.arc(this.position.x - nodeBasis.position.x,
            this.position.y - nodeBasis.position.y,
            this.radius,
            0,
            2 * Math.PI);
    }

    // Render the name to the context.
    renderName(context, nodeBasis) {

        // Draw text.
        context.font = "20px arial";
        context.textBaseline="middle";
        context.textAlign="center";
        context.fillStyle = this.colorText;
        //context.strokeStyle = this.colorTextContext;
        context.fillText(this.name,
            this.position.x - nodeBasis.position.x,
            this.position.y - nodeBasis.position.y);
        //context.strokeText(this.name,
        //    this.position.x - nodeBasis.position.x,
        //    this.position.y - nodeBasis.position.y);
    }

    // Render the node to the context.
    renderLinks(context, nodeBasis) {

        // Draw a line betwixt this node and its hook children.
        this.hookeChildren.forEach((nodeChild) => {

            context.moveTo(this.position.x - nodeBasis.position.x,
                this.position.y - nodeBasis.position.y);
            context.lineTo(nodeChild.position.x - nodeBasis.position.x,
                nodeChild.position.y - nodeBasis.position.y);
        });
    }

    // Compute the net force between this node and all its configured children.
    computeNetForce(nodeBasis, dTotalSeconds) {

        // Reset force each frame with a drag calculation.
        let objectForce = {

            x: this.velocity.x * DRAG_CONSTANT,
            y: this.velocity.y * DRAG_CONSTANT
        };

        // Process Coulomb repulsion.
        this.coulombChildren.forEach((nodeChild) => {

            // Get the angle between the two nodes, expressed in
            // rad counterclockwise from horitontal to the right.
            let dTheta = Math.atan2(this.position.y - nodeChild.position.y,
                this.position.x - nodeChild.position.x);

            // Get the distance between the two nodes.
            let dDistance = Math.sqrt(Math.pow(nodeChild.position.y - this.position.y, 2) +
                Math.pow(nodeChild.position.x - this.position.x, 2));

            // F = (k * q1 * q2) / d^2.
            let dCoulombMagnitude = COULOMB_CONSTANT * this.charge * nodeChild.charge / Math.pow(dDistance, 2);

            // Decompose the force vector, which is always
            // directed against the line of sight direction.
            let dCoulombX = dCoulombMagnitude * Math.cos(dTheta);
            let dCoulombY = dCoulombMagnitude * Math.sin(dTheta);

            // Accumulate additive force.
            objectForce.x += dCoulombX;
            objectForce.y += dCoulombY;
        });

        // Now, calculate attractvie, Hooke force.
        this.hookeChildren.forEach((nodeChild) => {

            // Get the angle between the two nodes, expressed in
            // rad counterclockwise from horitontal to the right.
            let dTheta = Math.atan2(nodeChild.position.y - this.position.y,
                nodeChild.position.x - this.position.x);

            // Get the distance between the two nodes.
            let dDistance = Math.sqrt(Math.pow(nodeChild.position.y - this.position.y, 2) +
                Math.pow(nodeChild.position.x - this.position.x, 2));

            // F = k * d.
            let dHookeMagnitude = HOOKE_CONSTANT * dDistance;

            // Decompose the force vector, which is always
            // directed towards the line of sight direction.
            let dHookeX = dHookeMagnitude * Math.cos(dTheta);
            let dHookeY = dHookeMagnitude * Math.sin(dTheta);

            // Accumulate additive force.
            objectForce.x += dHookeX;
            objectForce.y += dHookeY;
        });

        /* If vertical.
        if (this.vertical) {

            // Define a vertically bound oscilation.
            const dXOffset = Math.sin(new Date().getTime() / 2000);

            let dTheta = Math.atan2((nodeBasis.position.y - 200) - (this.position.y),
                (nodeBasis.position.x - 30 * dXOffset) - this.position.x);

            let dDistance = Math.sqrt(Math.pow((nodeBasis.position.y - 200) - this.position.y, 2) +
                Math.pow((nodeBasis.position.x - 30 * dXOffset) - this.position.x, 2));

            let dHookeMagnitude = HOOKE_CONSTANT * dDistance;
            let dHookeX = dHookeMagnitude * Math.cos(dTheta);
            let dHookeY = dHookeMagnitude * Math.sin(dTheta);

            objectForce.x += dHookeX;
            objectForce.y += dHookeY;
        }*/

        // Store the net force with the node.
        this.force = {

            x: objectForce.x / dTotalSeconds,
            y: objectForce.y / dTotalSeconds 
        };
    }

    // Compute the updated position of the node, given the net force.
    computePosition(dFrameSeconds, dTotalSeconds) {

        // First, cacluate acceleration.
        let objectAcceleration = {

            x: this.force.x / this.mass / dTotalSeconds,
            y: this.force.y / this.mass / dTotalSeconds
        };

        // Normalize acceleration if magnitude > MAXIMUM_VA.
        let dAccelerationMagnitude = Math.sqrt(Math.pow(objectAcceleration.x, 2) +
            Math.pow(objectAcceleration.y, 2));
        if (dAccelerationMagnitude > MAXIMUM_VA) {

            objectAcceleration = {

                x: MAXIMUM_VA * objectAcceleration.x / dAccelerationMagnitude,
                y: MAXIMUM_VA * objectAcceleration.y / dAccelerationMagnitude,
            }
        }

        // Now, calculate velocity.
        this.velocity = {

            x: (this.velocity.x + objectAcceleration.x) * 0.8,
            y: (this.velocity.y + objectAcceleration.y) * 0.8
        }

        // Scale the velocity for the time since the last frame.
        let objectScaledVelocity = {

            x: this.velocity.x * dFrameSeconds * ANIMATION_SPEED_CONSTANT,
            y: this.velocity.y * dFrameSeconds * ANIMATION_SPEED_CONSTANT
        }
        // Normalize scaled velocity if magnitude > MAXIMUM_VA.
        let dAccelerationScaledVelocity = Math.sqrt(Math.pow(objectScaledVelocity.x, 2) +
            Math.pow(objectScaledVelocity.y, 2));
        if (dAccelerationScaledVelocity > MAXIMUM_VA) {

            objectScaledVelocity = {

                x: MAXIMUM_VA * objectScaledVelocity.x / dAccelerationScaledVelocity,
                y: MAXIMUM_VA * objectScaledVelocity.y / dAccelerationScaledVelocity,
            }
        }

        // Finally, update position.
        this.position = {

            x: this.position.x + objectScaledVelocity.x ,
            y: this.position.y + objectScaledVelocity.y
        };
    }

    // Name.
    get name() {

        if (this.m_strName === undefined) {

            this.m_strName = "";
        }
        return this.m_strName;
    }
    set name(strValue) {

        this.m_strName = strValue;
    }

    // Vertical.
    get vertical() {

        if (this.m_bVertical === undefined) {

            this.m_bVertical = false;
        }
        return this.m_bVertical;
    }
    set vertical(bValue) {

        this.m_bVertical = bValue;
    }

    // Color.
    get color() {

        if (this.m_strColor === undefined) {

            this.m_strColor = "yellow";
        }
        return this.m_strColor;
    }
    set color(strValue) {

        this.m_strColor = strValue;
    }

    // Color link.
    get colorLink() {

        if (this.m_strColorLink === undefined) {

            this.m_strColorLink = "rgb(20,20,20,0.5)";
        }
        return this.m_strColorLink;
    }
    set colorLink(strValue) {

        this.m_strColorLink = strValue;
    }

    // Color Text.
    get colorText() {

        if (this.m_strColorText === undefined) {

            this.m_strColorText = "black";
        }
        return this.m_strColorText;
    }
    set colorText(strValue) {

        this.m_strColorText = strValue;
    }

    // Color Text context.
    get colorTextContext() {

        if (this.m_strColorTextContext === undefined) {

            this.m_strColorTextContext = "white";
        }
        return this.m_strColorTextContext;
    }
    set colorTextContext(strValue) {

        this.m_strColorTextContext = strValue;
    }

    // Position.
    get position() {

        if (this.m_dX === undefined) {

            this.m_dX = 0;
        }
        if (this.m_dY === undefined) {

            this.m_dY = 0;
        }
        return {

            x: this.m_dX,
            y: this.m_dY
        };
    }
    set position(objectValue) {

        this.m_dX = objectValue.x;
        this.m_dY = objectValue.y;
    }

    // Force.
    get force() {

        if (this.m_dForceX === undefined) {

            this.m_dForceX = 0;
        }
        if (this.m_dForceY === undefined) {

            this.m_dForceY = 0;
        }
        return {

            x: this.m_dForceX,
            y: this.m_dForceY
        };
    }
    set force(objectValue) {

        this.m_dForceX = objectValue.x;
        this.m_dForceY = objectValue.y;
    }

    // Acceleration.
    get acceleration() {

        if (this.m_dAccelerationX === undefined) {

            this.m_dAccelerationX = 0;
        }
        if (this.m_dAccelerationY === undefined) {

            this.m_dAccelerationY = 0;
        }
        return {

            x: this.m_dAccelerationX,
            y: this.m_dAccelerationY
        };
    }
    set acceleration(objectValue) {

        this.m_dAccelerationX = objectValue.x;
        this.m_dAccelerationY = objectValue.y;
    }

    // Velocity.
    get velocity() {

        if (this.m_dVelocityX === undefined) {

            this.m_dVelocityX = 0;
        }
        if (this.m_dVelocityY === undefined) {

            this.m_dVelocityY = 0;
        }
        return {

            x: this.m_dVelocityX,
            y: this.m_dVelocityY
        };
    }
    set velocity(objectValue) {

        this.m_dVelocityX = objectValue.x;
        this.m_dVelocityY = objectValue.y;
    }

    // Radius.
    get radius() {

        if (this.m_dRadius === undefined) {

            this.m_dRadius = 20;
        }
        return this.m_dRadius;
    }
    set radius(dValue) {

        this.m_dRadius = dValue;
    }

    // Mass.
    get mass() {

        if (this.m_dMass === undefined) {

            this.m_dMass = 0.001;
        }
        return this.m_dMass;
    }
    set mass(dValue) {

        this.m_dMass = dValue;
    }

    // charge.
    get charge() {

        if (this.m_dCharge === undefined) {

            this.m_dCharge = 1000.0;
        }
        return this.m_dCharge;
    }
    set charge(dValue) {

        this.m_dCharge = dValue;
    }

    // Collection of children for Hooke force.
    get hookeChildren() {

        if (!this.m_arrayHookeChildren) {

            this.m_arrayHookeChildren = [];
        }
        return this.m_arrayHookeChildren;
    }

    // Collection of children for Coulomb force.
    get coulombChildren() {

        if (!this.m_arrayCoulombChildren) {

            this.m_arrayCoulombChildren = [];
        }
        return this.m_arrayCoulombChildren;
    }
    set coulombChildren(arrayValue) {

        this.m_arrayCoulombChildren = arrayValue;
    }
}