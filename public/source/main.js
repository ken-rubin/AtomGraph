//////////////////////////////
// Handles resizing canvases.
//

class Main {

    create() {

        this.components = {};

        fetch('/hierarchy', {

            method: 'POST',
            headers: {

                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        }).then((response) => {

            return response.json();
        }).then((hierarchy) => {

            /* Draw the graph.
            const renderGraph = (renderContext, width, height) => {

                // Condition the drawing context.
                renderContext.strokeStyle = "rgba(200, 100, 50, 1)";
                renderContext.lineWidth = 1.0;

                // Draw all components.
                const numberOfComponents = Object.keys(this.components).length;
                const columns = Math.ceil(Math.sqrt(numberOfComponents));
                let count = 0;
                renderContext.beginPath();
                for (const componentName in this.components) {

                    // Extract the component to draw.
                    const component = this.components[componentName];

                    // Calculate coordinates for this component.  Store in component.
                    component.column = count % columns;
                    component.row = Math.floor(count++ / columns);
                    component.x = component.column * 72 + 36;
                    component.y = component.row * 72 + 36;

                    renderContext.moveTo(component.x, component.y);
                    renderContext.arc(component.x, component.y, 32, 0, 2 * Math.PI);
                }
                renderContext.stroke();

                renderContext.strokeStyle = "rgba(50, 100, 200, 0.5)";

                // Draw the linkages.
                renderContext.beginPath();
                for (const componentName in this.components) {

                    // Extract the component for which to draw links.
                    const component = this.components[componentName];

                    // Loop over all linkages.
                    for (const linkName in component.links) {

                        // Get the linked component.
                        const linkedComponent = component.links[linkName];

                        // Draw a line betwixt.
                        renderContext.moveTo(component.x, component.y);
                        renderContext.lineTo(linkedComponent.x, linkedComponent.y);
                    }
                }
                renderContext.stroke();
            };*/

            // Process hierarchy into top-level nodes.
            for (const key in hierarchy) {

                const node = hierarchy[key];
                if (node.children) {

                    node.children.forEach((child) => {

                        if (child.tagName) {

                            child.links = {};
                            this.components[child.tagName] = child;
                            //this.components[child.tagName].node = new Node(child.tagName);
                            //nodes.push(this.components[child.tagName].node);
                        }
                    });
                }
            }

            // Process hierarhcy and components into links.
            for (const componentName in this.components) {

                // Extract the component to work.
                const component = this.components[componentName];

                // Define a function that processes all the children of the component.
                const processChildren = (parent) => {

                    // Only if there are children....
                    if (parent.children) {

                        // Scan each child.
                        parent.children.forEach((child) => {

                            // Try to get the component with the name of the tag.
                            const childComponent = this.components[child.tagName];

                            // If the child component exists...
                            if (childComponent) {

                                // ...link.
                                component.links[child.tagName] = childComponent;
                                //component.node.hookeChildren.push(childComponent.node);
                                //childComponent.node.hookeChildren.push(component.node);
                            }

                            // Recurse down.
                            processChildren(child);
                        });
                    }
                };

                // Pass in the component to be processed.
                processChildren(component);
            }

            // Setup nodes relative to some component.

            // Choose some component to be the root.
            let componentMostConnected = this.components[Object.keys(this.components)[0]];
            for (const componentName in this.components) {

                // Extract the component to work.
                const component = this.components[componentName];
                if (Object.keys(component.links).length > 
                    Object.keys(componentMostConnected.links).length) {

                    componentMostConnected = component;
                }
            }

            // Create a base node for it and add that to the nodes collection.
            const nodes = [];
            const nodeDataElement = new Node(componentMostConnected.tagName);
            componentMostConnected.node = nodeDataElement;
            nodes.push(nodeDataElement);

            // Add in all the links to this component.
            const addLinks = (level, parent) => {

                for (let linkName in parent.links) {

                    const linkComponent = parent.links[linkName];
                    const nodeLink = new Node(linkComponent.tagName);
                    linkComponent.node = nodeLink;
                    nodes.push(nodeLink);
                    parent.node.hookeChildren.push(nodeLink);
                    nodeLink.hookeChildren.push(parent.node);

                    if (level < 1) {

                        addLinks(level + 1, linkComponent);
                    }
                }
            };
            addLinks(0, componentMostConnected);

            let theta = 0;
            let dTheta = 0.1;
            let r = 0;
            let dR = 5;
            nodes.forEach((nodeParent) => {

                nodeParent.position = {

                    x: r * Math.cos(theta),
                    y: r * Math.sin(theta)
                };
                r += dR;
                theta += dTheta;

                nodeParent.coulombChildren = nodes.filter((nodeChild) => {
                    return (nodeChild != nodeParent); });
            });

            // Get canvas.
            const canvas = document.getElementById("GraphCanvas");

            // Get context.
            const context = canvas.getContext("2d");

            // Save date of last render so each render can scale its speed smoothly.
            let dateFirstRender = new Date();
            let dateLastRender = new Date();
            const functionAnimate = () => {

                // Compute frame time.
                let dFrameMilliseconds = (new Date() - dateLastRender);
                let dTotalMilliseconds = (new Date() - dateFirstRender) + 1;
                dateLastRender = new Date();

                // Compute the nodes net force.
                nodes.forEach((nodeChild) => {

                    nodeChild.computeNetForce(nodeDataElement, dTotalMilliseconds / 1000);
                });

                // Adjust positions....
                nodes.forEach((nodeChild) => {

                    nodeChild.computePosition(dFrameMilliseconds / 1000, dTotalMilliseconds / 1000);
                });

                // Clear the frame.
                context.clearRect(-canvas.width / 2,
                    -canvas.height / 2,
                    canvas.width,
                    canvas.height);

                // Render the links.
                context.strokeStyle = "black";
                context.beginPath();
                nodes.forEach((nodeChild) => {

                    nodeChild.renderLinks(context,
                        nodeDataElement);
                });
                context.stroke();

                // Render the nodes.
                context.fillStyle = "yellow";
                context.strokeStyle = "black";
                context.beginPath();
                nodes.forEach((nodeChild) => {

                    nodeChild.render(context,
                        nodeDataElement);
                });
                context.fill();
                //context.stroke();

                // Render the node's names.
                nodes.forEach((nodeChild) => {

                    nodeChild.renderName(context,
                        nodeDataElement);
                });

                // Do it again.
                window.requestAnimationFrame(functionAnimate);
            };

            // Start the animation sequence.
            window.requestAnimationFrame(functionAnimate);

            // Wire up canvas.
            new CanvasResizer(canvas, context).start();
        }).catch((x) => {

            console.error(`error: ${x.message}.`);
        })
    }

}