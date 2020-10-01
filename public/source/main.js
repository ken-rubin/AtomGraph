//////////////////////////////
// Handles resizing canvases.
// 

class Main {

    constructor() {

        // Components come from the server.
        const components = {};

        // Go to the seerver to get the hierarchy which build the components.
        // The rest of the processing for the application proceeds from there.
        fetch('/hierarchy', {

            method: 'POST',
            headers: {

                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        }).then((response) => {

            return response.json();
        }).then((hierarchy) => {

            // Process hierarchy into top-level components.
            for (const key in hierarchy) {

                const node = hierarchy[key];
                if (node.children) {

                    node.children.forEach((child) => {

                        if (child.tagName) {

                            child.links = {};
                            components[child.tagName] = child;
                        }
                    });
                }
            }

            // Process hierarhcy and components into links.
            for (const componentName in components) {

                // Extract the component to work.
                const component = components[componentName];

                // Define a function that processes all the children of the component.
                const processChildren = (parent) => {

                    // Only if there are children....
                    if (parent.children) {

                        // Scan each child.
                        parent.children.forEach((child) => {

                            // Try to get the component with the name of the tag.
                            const childComponent = components[child.tagName];

                            // If the child component exists...
                            if (childComponent) {

                                // ...link.
                                component.links[child.tagName] = childComponent;
                            }

                            // Recurse down.
                            processChildren(child);
                        });
                    }
                };

                // Pass in the component to be processed.
                processChildren(component);
            }

            // Here, components holds the root elements and their linkages.
            const nodes = [];
            let nodeDataElement = null;

            // Create a node for each component.
            for (const componentName in components) {

                // Extract the component to work.
                const component = components[componentName];
                const nodeComponent = new Node(component.tagName);
                nodeComponent.charge = Math.pow(component.cardinality, 2);
                nodeComponent.mass = Math.pow(component.cardinality, 0.5);
                if (!nodeDataElement) {

                    nodeDataElement = nodeComponent;
                }
                component.node = nodeComponent;
                nodes.push(nodeComponent);
            }
            // Link the nodes whose components are linked.
            for (const componentName in components) {

                // Extract the component to work.
                const component = components[componentName];
                for (const linkName in component.links) {

                    // Extract the link to work.
                    const link = component.links[linkName];

                    component.node.hookeChildren.push(link.node);
                    link.node.hookeChildren.push(component.node);
                }
            }

            /* Setup nodes relative to some component.

            // Choose some component to be the root.
            const componentKeys = Object.keys(components);
            let randomIndex = Math.floor(Math.random() * componentKeys.length);
            let componentRoot = components[componentKeys[randomIndex]];
            while (!componentRoot.links ||
                componentRoot.links.length) {

                randomIndex = Math.floor(Math.random() * componentKeys.length);
                componentRoot = components[componentKeys[randomIndex]];
            }
            // Create a base node for it and add that to the nodes collection.
            const nodeDataElement = new Node(componentRoot.tagName);
            componentRoot.node = nodeDataElement;
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
            addLinks(0, componentRoot);

            // Add in linkees too.
            for (const componentName in components) {

                // Extract the component to work.
                const component = components[componentName];
                for (const linkName in component.links) {

                    if (linkName === componentRoot.tagName) {

                        const nodeLinkee = new Node(componentName + "*");
                        nodes.push(nodeLinkee);
                        nodeDataElement.hookeChildren.push(nodeLinkee);
                        nodeLinkee.hookeChildren.push(nodeDataElement);
                    }                                  
                }
            }*/

            // Prime nodes.
            let theta = 0.1;
            let dTheta = Math.PI * 2.0 * 2 / nodes.length;
            let r = 0;
            let dR = 500 / nodes.length;
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

            let scale = 0.5;
            let translateX = 0;
            let translateY = 0;

            const setTransform = () => {

                context.setTransform(scale,
                    0,
                    0,
                    scale,
                    translateX,
                    translateY);
            };

            canvas.addEventListener("wheel", (e) => {

                scale += e.deltaY * -0.01;
                if (scale < 0.1) {

                    scale = 0.1;
                } else if (scale > 10.0) {

                    scale = 10.0;
                }
                setTransform();
            });

            let mouseDownPoint = null;
            let originalX = 0;
            let originalY = 0;
            canvas.addEventListener("mousedown", (e) => {

                mouseDownPoint = {

                    x: e.clientX,
                    y: e.clientY
                };
                originalX = translateX;
                originalY = translateY;
            });
            canvas.addEventListener("mousemove", (e) => {

                if (mouseDownPoint) {

                    const dX = e.clientX - mouseDownPoint.x;
                    translateX = originalX + dX;
                    const dY = e.clientY - mouseDownPoint.y;
                    translateY = originalY + dY;
                    setTransform();
                }
            });
            canvas.addEventListener("mouseup", (e) => {

                mouseDownPoint = null;
            });
            canvas.addEventListener("mouseout", (e) => {

                mouseDownPoint = null;
            });


            // Save date of last render so each render can scale its speed smoothly.
            let dateFirstRender = new Date();
            let dateLastRender = new Date();
            const functionAnimate = () => {

                // Compute frame time.
                let dFrameMilliseconds = (new Date() - dateLastRender);
                let dTotalMilliseconds = (new Date() - dateFirstRender);
                dateLastRender = new Date();

                // Compute the node's net force.
                nodes.forEach((nodeChild) => {

                    nodeChild.computeNetForce(nodeDataElement, dTotalMilliseconds / 1000);
                });

                // Adjust positions....
                nodes.forEach((nodeChild) => {

                    nodeChild.computePosition(dFrameMilliseconds / 1000, dTotalMilliseconds / 1000);
                });

                // Clear the frame.
                context.clearRect(-translateX / scale,
                    -translateY / scale,
                    canvas.width / scale,
                    canvas.height / scale);

                // Render the links.
                context.strokeStyle = "rgba(0, 0, 0,0.1)";
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

                // Render the node's names.
                context.font = "20px arial";
                context.textBaseline = "middle";
                context.textAlign = "center";
                context.fillStyle = "black";
                nodes.forEach((nodeChild) => {

                    nodeChild.renderName(context,
                        nodeDataElement);
                });

                // Do it again.
                window.requestAnimationFrame(functionAnimate);
            };

            // Start the animation sequence.
            window.requestAnimationFrame(functionAnimate);

            // Wire up canvas for resize handling.
            new CanvasResizer(canvas, context, () => {

                translateX = canvas.width / 2;
                translateY = canvas.height / 2;
                setTransform();
            }).start();
        }).catch((x) => {

            console.error(`error: ${x.message}.`);
        })
    }

}