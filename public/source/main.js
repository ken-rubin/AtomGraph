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

            ////////////////////////////
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

            ////////////////////////////
            // Turn components into force-directed graph of nodes.
            const nodes = [];
            let nodeRoot = null;

            // Create a node for each component.
            for (const componentName in components) {

                // Extract the component to work.
                const component = components[componentName];
                const nodeComponent = new Node(component.tagName);
                nodeComponent.baseCharge = nodeComponent.charge * component.cardinality;
                nodeComponent.baseMass = Math.pow(nodeComponent.mass * component.cardinality, 0.5);
                if (!nodeRoot) {

                    nodeRoot = nodeComponent;
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

            // Prime nodes.
            let theta = 1;
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

            // Get a references to the details container div.
            const divDetailsContainer = document.getElementById("DetailsContainerDiv");

            // Define this up here in case we want to re-enable 
            // animation based on selectRootNode just below.... 
            let dateFirstRender = new Date();

            // Define the buckets for display:
            let rootParents = [];
            let rootChildren = [];
            let otherNodes = [];
            // These buckets are filled in selectRootNode, when a node is selected.
            const selectRootNode = (nodeToSelect) => {

                nodeRoot = nodeToSelect;
                let rootComponent = components[nodeRoot.name];

                // Reset display buckets.
                rootParents = [];
                rootChildren = [];
                otherNodes = [];

                // Reset first render so the graph adjusts to the new selection.
                dateFirstRender = new Date();

                // Sort all nodes into one of 4 states:
                // Either the root, parents of the root, 
                // children of the root or other nodes.
                for (let componentName in components) {

                    let component = components[componentName];

                    // Just skip if root node.
                    if (component.node === nodeRoot) {

                        nodeRoot.mass = nodeRoot.baseMass * 1000.0;
                        nodeRoot.charge = nodeRoot.baseCharge * 0.01;
                        continue;
                    }
                    // Look for parents.
                    let foundRootParent = null;
                    for (let linkName in component.links) {

                        if (linkName === nodeRoot.name) {

                            foundRootParent = component.node;
                            break;
                        }
                    }
                    if (foundRootParent) {

                        rootParents.push(foundRootParent);
                        foundRootParent.mass = foundRootParent.baseMass;
                        foundRootParent.charge = foundRootParent.baseCharge;

                        continue;
                    }
                    // Look for children.
                    let foundRootChild = null;
                    for (let linkName in rootComponent.links) {

                        if (linkName === component.node.name) {

                            foundRootChild = component.node;
                            break;
                        }
                    }
                    if (foundRootChild) {

                        rootChildren.push(foundRootChild);
                        foundRootChild.mass = foundRootChild.baseMass;
                        foundRootChild.charge = foundRootChild.baseCharge;
                        continue;
                    }
                    otherNodes.push(component.node);
                    component.node.mass = component.node.baseMass * 0.1;
                    component.node.charge = component.node.baseCharge * 0.1;
                }

                // Clear details div.
                divDetailsContainer.innerHTML = "";

                // Add some details about the component.
                const divName = document.createElement("div");
                divName.classList.add("DetailItem");
                divName.innerText = `${rootComponent.tagName} (${rootComponent.cardinality})`;
                divDetailsContainer.appendChild(divName);

                if (rootComponent.description) {
                    
                    const divDescription = document.createElement("div");
                    divDescription.classList.add("DetailItem");
                    divDescription.innerText = `${rootComponent.description}`;
                    divName.appendChild(divDescription);
                }

                if (rootComponent.columns) {

                    const divColumns = document.createElement("div");
                    divColumns.classList.add("DetailItem");
                    divColumns.innerText = `columns`;
                    divDetailsContainer.appendChild(divColumns);

                    rootComponent.columns.forEach((column) => {

                        const divColumn = document.createElement("div");
                        divColumn.classList.add("DetailItem");
                        divColumn.innerText = `${column.name} [${column.type}] (${column.width})`;
                        divColumns.appendChild(divColumn);
                    });
                }

                if (rootComponent.subscription) {

                    const divSubscriptionContainer = document.createElement("div");
                    divSubscriptionContainer.classList.add("DetailItem");
                    divSubscriptionContainer.innerText = `subscription`;
                    divDetailsContainer.appendChild(divSubscriptionContainer);

                    const divSubscription = document.createElement("div");
                    divSubscription.classList.add("DetailItem");
                    divSubscription.innerText = `${rootComponent.subscription}`;
                    divSubscriptionContainer.appendChild(divSubscription);
                }
            };

            // "Select" the root node.
            selectRootNode(nodeRoot);

            // Get canvas.
            const canvas = document.getElementById("GraphCanvas");
            // Get context.
            const context = canvas.getContext("2d");

            // Define transform bits-state and function 
            // to set the transform to those bits.
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

            // Zoom in or out based on wheel.
            canvas.addEventListener("wheel", (e) => {

                scale += e.deltaY * -0.01;
                if (scale < 0.1) {

                    scale = 0.1;
                } else if (scale > 10.0) {

                    scale = 10.0;
                }
                setTransform();
            });

            // Get SearchInput and wire input event.
            const inputSearch = document.getElementById("SearchInput");

            inputSearch.addEventListener("click", () => {

                inputSearch.dispatchEvent(new Event("input"));
            });
            inputSearch.addEventListener("input", () => {

                const theString = inputSearch.value;

                // Scan the nodes.  If the node name starts with
                // the string being typed, then select it here.
                if (theString) {

                    let matches = [];
                    nodes.forEach((node) => {

                        if (node.name.toUpperCase().startsWith(theString.toUpperCase())) {

                            matches.push(node);
                        } else {

                            // Perhaps it is a regular expression?
                            const regex = new RegExp("^" + theString, "i");
                            if (regex.test(node.name)) {

                                matches.push(node);
                            }
                        }
                    });

                    if (matches.length === 1) {

                        // "Select" the root node.
                        selectRootNode(matches[0]);

                        translateX = canvas.width / 2 + canvas.width / 8;
                        translateY = canvas.height / 2;
                        setTransform();
                    } else if (matches.length > 1) {

                        // Clear details container div.
                        divDetailsContainer.innerHTML = "";

                        // Load up pills into the details container div.
                        matches.forEach((match) => {

                            const divMatch = document.createElement("div");
                            divMatch.classList.add("MatchItem");
                            divMatch.innerText = match.name;
                            divDetailsContainer.appendChild(divMatch);

                            divMatch.addEventListener("click", () => {

                                // "Select" the root node.
                                selectRootNode(match);

                                translateX = canvas.width / 2 + canvas.width / 8;
                                translateY = canvas.height / 2;
                                setTransform();
                            });
                        });
                    }
                }
            });

            // Pan or select based on pointer events.
            let mouseDownPoint = null;
            let originalX = 0;
            let originalY = 0;
            let lastClickTime = null;
            canvas.addEventListener("pointerdown", (e) => {

                if (lastClickTime &&
                    new Date() - lastClickTime < 250) {

                    // Test if press down on node.
                    // If so, circumvent the normal
                    // path for canvas dragging.

                    // Calculate the point coordinates in "node"-space.
                    const nodeX = (e.clientX - translateX) / scale;
                    const nodeY = (e.clientY - translateY) / scale;

                    // Loop over all nodes.
                    let picked = false;
                    nodes.forEach((node) => {

                        if (!picked &&
                            Math.abs((node.position.x - nodeRoot.position.x) - nodeX) < 20 / scale &&
                            Math.abs((node.position.y - nodeRoot.position.y) - nodeY) < 20 / scale) {

                            picked = true;

                            inputSearch.value = "^" + node.name + "$";

                            // "Select" the node as root.
                            selectRootNode(node);

                            translateX = canvas.width / 2 + canvas.width / 8;
                            translateY = canvas.height / 2;
                            setTransform();

                        }
                    });
                }
                lastClickTime = new Date();

                mouseDownPoint = {

                    x: e.clientX,
                    y: e.clientY
                };
                originalX = translateX;
                originalY = translateY;
            });
            canvas.addEventListener("pointermove", (e) => {

                if (mouseDownPoint) {

                    const dX = e.clientX - mouseDownPoint.x;
                    translateX = originalX + dX;
                    const dY = e.clientY - mouseDownPoint.y;
                    translateY = originalY + dY;
                    setTransform();
                }
            });
            canvas.addEventListener("pointerup", (e) => {

                mouseDownPoint = null;
            });
            canvas.addEventListener("pointerout", (e) => {

                mouseDownPoint = null;
            });

            // Save date of last render so each render can scale its speed smoothly.
            let dateLastRender = new Date();

            // Method updates nodes and renders.
            const functionAnimate = () => {

                // Compute frame time.
                let dFrameMilliseconds = (new Date() - dateLastRender);
                let dTotalMilliseconds = (new Date() - dateFirstRender);
                dateLastRender = new Date();

                // Compute the node's net force.
                nodes.forEach((nodeChild) => {

                    nodeChild.computeNetForce(nodeRoot, dTotalMilliseconds / 1000);
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

                    if (nodeChild !== nodeRoot) {

                        nodeChild.renderLinks(context,
                            nodeRoot);
                    }
                });
                context.stroke();
                context.strokeStyle = "rgba(0, 0, 0,0.9)";
                context.beginPath();
                nodeRoot.renderLinks(context,
                    nodeRoot);
                context.stroke();

                // Render the nodes:

                // First, the root.
                context.fillStyle = "yellow";
                context.beginPath();
                nodeRoot.render(context,
                    nodeRoot);
                context.fill();

                // Next the parents of the root node.
                context.fillStyle = "lightblue";
                context.beginPath();
                rootParents.forEach((nodeChild) => {

                    nodeChild.render(context,
                        nodeRoot);
                });
                context.fill();

                // Next the children of the root node.
                context.fillStyle = "magenta";
                context.beginPath();
                rootChildren.forEach((nodeChild) => {

                    nodeChild.render(context,
                        nodeRoot);
                });
                context.fill();

                // Last the other nodes.
                context.fillStyle = "rgba(0,255,255, 0.25)";
                context.beginPath();
                otherNodes.forEach((nodeChild) => {

                    nodeChild.render(context,
                        nodeRoot);
                });
                context.fill();

                // Render the node's names.
                context.font = "20px arial";
                context.textBaseline = "middle";
                context.textAlign = "center";
                context.fillStyle = "rgba(0,0,0,0.1)";
                otherNodes.forEach((nodeChild) => {

                    nodeChild.renderName(context,
                        nodeRoot);
                });
                context.fillStyle = "rgba(0,0,0,0.7)";
                rootChildren.forEach((nodeChild) => {

                    nodeChild.renderName(context,
                        nodeRoot);
                });
                context.fillStyle = "rgba(0,0,0,0.7)";
                rootParents.forEach((nodeChild) => {

                    nodeChild.renderName(context,
                        nodeRoot);
                });
                context.fillStyle = "rgba(0,0,0,1)";
                nodeRoot.renderName(context,
                    nodeRoot);

                // Do it again.
                window.requestAnimationFrame(functionAnimate);
            };

            // Start the animation sequence.
            window.requestAnimationFrame(functionAnimate);

            // Wire up canvas for resize handling.
            new CanvasResizer(canvas, context, () => {

                translateX = canvas.width / 2 + canvas.width / 8;
                translateY = canvas.height / 2;
                setTransform();
            }).start();
        }).catch((x) => {

            console.error(`error: ${x.message}.`);
        })
    }

}