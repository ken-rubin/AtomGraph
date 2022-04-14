//////////////////////////////
// Handles resizing canvases.
// 

class Main {

    constructor() {

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

            const components = {};
            for (const key in hierarchy) {

                const node = hierarchy[key];
                if (node.children) {

                    if (node.tagName) {

                        node.links = {};
                        components[node.tagName] = node;
                    }
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
            let nodes = [];

            // Create a node for each component.
            for (const componentName in components) {

                // Extract the component to work.
                const component = components[componentName];
                const nodeComponent = new Node(component.tagName);
                nodeComponent.children = [];
                nodeComponent.notes = component.notes;
                nodeComponent.baseCharge = nodeComponent.charge * component.cardinality;
                nodeComponent.baseMass = Math.pow(nodeComponent.mass * component.cardinality, 0.5);
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

                    component.node.children.push(link.node);
                    component.node.hookeChildren.push(link.node);
                    link.node.hookeChildren.push(component.node);
                }
            }

            ///////////////////////////////////////////////
            // DO NOT REFER TO COMPONENTS BELOW THIS LINE!

            // Prime nodes.
            let theta = 1;
            let dTheta = Math.PI * 2.0 * 2 / nodes.length;
            let r = 0;
            let dR = 0.1;
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

            // Helper method ensures there is at least one node.
            const makeSureThereIsAtLeastOneNode = () => {

                // Make sure there is at least one node.
                if (!nodes.length) {

                    // Generate new, unique name.
                    let newName = "node " + Math.floor(Math.random() * 1000000).toString();

                    // Add new node.
                    const newNode = new Node(newName);
                    newNode.notes = "";
                    newNode.children = [];
                    newNode.position = {

                        x: rootNode.position.x + r * Math.cos(theta),
                        y: rootNode.position.y + r * Math.sin(theta)
                    };
                    r += dR;
                    theta += dTheta;
                    newNode.baseCharge = newNode.charge;
                    newNode.baseMass = Math.pow(newNode.mass, 0.5);

                    // Add new node to nodes collection.
                    nodes.push(newNode);
                }
            };
            makeSureThereIsAtLeastOneNode();

            // Get a references to the details container div.
            const divDetailsContainer = document.getElementById("DetailsContainerDiv");

            // Helper method loads up the details selection with a set of 
            // clickable pills and takes a callback to invoke when clicked.
            const loadUpDetailSectionWithClickablePills = (title, matches, clickCallback) => {

                // Clear details container div.
                divDetailsContainer.innerHTML = "";

                // Add title.
                const divTitle = document.createElement("div");
                divTitle.classList.add("DetailItem");
                divTitle.innerText = title;
                divDetailsContainer.appendChild(divTitle);

                // Load up pills into the details container div.
                matches.forEach((match) => {

                    const divMatch = document.createElement("div");
                    divMatch.classList.add("MatchItem");
                    divMatch.innerText = match.name;
                    divDetailsContainer.appendChild(divMatch);

                    divMatch.addEventListener("click", () => {
                        
                        clickCallback(match);
                    });
                });
            };

            // Define this up here in case we want to re-enable 
            // animation based on selectRootNode just below.... 
            let dateFirstRender = new Date();

            // Define the buckets for display:
            let rootNode = nodes.find((node) => {

                return node.name === "WatchListFromName";
            });
            if (!rootNode) {

                rootNode = nodes[0];
            }
            let rootParents = [];
            let rootChildren = [];
            let otherNodes = [];

            // These buckets are filled in selectRootNode, when a node is selected.
            const selectRootNode = (nodeToSelect) => {

                rootNode = nodeToSelect;

                // Reset display buckets.
                rootParents = [];
                rootChildren = [];
                otherNodes = [];

                // Reset first render so the graph adjusts to the new selection.
                dateFirstRender = new Date();

                // Sort all nodes into one of 4 states:
                // Either the root, parents of the root, 
                // children of the root or other nodes.
                nodes.forEach((node) => {

                    if (node == rootNode) {

                        rootNode.mass = rootNode.baseMass * rootNode.hookeChildren.length;
                        rootNode.charge = rootNode.baseCharge * rootNode.hookeChildren.length;
                    } else {

                        let parent = false;
                        node.children.forEach((child) => {

                            if (child === rootNode) {

                                rootParents.push(node);
                                node.mass = node.baseMass;
                                node.charge = node.baseCharge;
                                parent = true;
                            }
                        });

                        if (!parent) {

                            let child = false;
                            rootNode.children.forEach((child) => {

                                if (child === node) {

                                    rootChildren.push(node);
                                    node.mass = node.baseMass;
                                    node.charge = node.baseCharge;
                                    child = true;
                                }
                            });

                            if (!child) {

                                otherNodes.push(node);
                                node.mass = node.baseMass;
                                node.charge = node.baseCharge;
                            }
                        }
                    }
                });

                // Clear details div.
                divDetailsContainer.innerHTML = "";

                // Add editable name of the node.
                const divName = document.createElement("div");
                divName.classList.add("DetailItem");
                divDetailsContainer.appendChild(divName);

                const inputName = document.createElement("input");
                inputName.classList.add("DetailItemInputChild");
                inputName.value = `${rootNode.name}`;
                divName.appendChild(inputName);
                inputName.addEventListener("input", () => {

                    // Make sure that value is valid....
                    if (inputName.value === "") {

                        inputName.value = ".";
                    }
                    let matched = "";
                    do {

                        matched = "";
                        nodes.forEach((node) => {

                            if (node.name === inputName.value &&
                                inputName.value !== rootNode.name) {

                                matched = node.name;
                            }
                        });
                        if (matched) {

                            inputName.value = matched + "+";
                        }
                    } while (matched);

                    // Update node name.
                    rootNode.name = inputName.value;
                });

                const divButtonGroup = document.createElement("div");
                divButtonGroup.classList.add("DetailGroup");

                // Add in action buttons.
                const buttonLink = document.createElement("button");
                buttonLink.classList.add("DetailButton");
                buttonLink.innerText = `link`;
                divButtonGroup.appendChild(buttonLink);
                buttonLink.addEventListener("click", () => {

                    // Build up collection of matches to present here.
                    // All nodes, except those which are already linked.
                    const matches = [];
                    nodes.forEach((node) => {

                        if (node !== rootNode &&
                            !rootNode.children.includes(node)) {

                            matches.push(node);
                        }
                    });
                    loadUpDetailSectionWithClickablePills("link nodes:", matches, (match) => {

                        // A match (a node) to the collection of children
                        // and to the hook children.  and root to its....
                        rootNode.children.push(match);
                        rootNode.hookeChildren.push(match);
                        match.hookeChildren.push(rootNode);

                        // Re load up.
                        selectRootNode(rootNode);
                    });
                });

                const buttonUnlink = document.createElement("button");
                buttonUnlink.classList.add("DetailButton");
                buttonUnlink.innerText = `unlink`;
                divButtonGroup.appendChild(buttonUnlink);
                buttonUnlink.addEventListener("click", () => {

                    loadUpDetailSectionWithClickablePills("unlink nodes:", rootNode.children, (match) => {

                        // Remove match (a node) from the collection of children
                        // and from the hook children.  and root from its....
                        rootNode.children = rootNode.children.filter((node) => {

                            return node !== match;
                        });
                        rootNode.hookeChildren = rootNode.hookeChildren.filter((node) => {

                            return node !== match;
                        });
                        match.hookeChildren = match.hookeChildren.filter((node) => {

                            return node !== rootNode;
                        });

                        // Re load up.
                        selectRootNode(rootNode);
                    });
                });

                const buttonAddChild = document.createElement("button");
                buttonAddChild.classList.add("DetailButton");
                buttonAddChild.innerText = `add child`;
                divButtonGroup.appendChild(buttonAddChild);
                buttonAddChild.addEventListener("click", () => {

                    // Generate new, unique name.
                    let newName = "node " + Math.floor(Math.random() * 1000000).toString();

                    // Add new node.
                    const newNode = new Node(newName);
                    newNode.position = {

                        x: rootNode.position.x + r * Math.cos(theta),
                        y: rootNode.position.y + r * Math.sin(theta)
                    };
                    r += dR;
                    theta += dTheta;
                    newNode.baseCharge = newNode.charge;
                    newNode.baseMass = Math.pow(newNode.mass, 0.5);
                    newNode.children = [];
                    newNode.notes = "";

                    // Add node as coulomb child of all other nodes.
                    nodes.forEach((node) => {

                        node.coulombChildren.push(newNode);
                    });

                    // Add hook children from root node to new node and back.
                    rootNode.hookeChildren.push(newNode);
                    newNode.hookeChildren.push(rootNode);

                    // Add new node as child of rootNode
                    rootNode.children.push(newNode);

                    // Add new node to nodes collection.
                    nodes.push(newNode);

                    // Rebuild collections.
                    selectRootNode(rootNode);
                });

                const buttonSave = document.createElement("button");
                buttonSave.classList.add("DetailButton");
                buttonSave.innerText = `save`;
                divButtonGroup.appendChild(buttonSave);
                buttonSave.addEventListener("click", () => {

                    // Generate replete hierarchy from nodes.
                    const returnHierarchy = {};
                    nodes.forEach((node) => {

                        const nodeComponent = {

                            tagName: node.name,
                            cardinality: 1,
                            notes: node.notes,
                            children: []
                        };

                        node.children.forEach((child) => {

                            nodeComponent.children.push({

                                tagName: child.name,
                                children: []
                            });
                        });

                        returnHierarchy[node.name] = nodeComponent;
                    });

                    // Send to server.
                    fetch('/save', {

                        method: 'POST',
                        headers: {

                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(returnHierarchy)
                    }).then((response) => {

                        return response.json();
                    }).then(() => {

                    }).catch((x) => {

                        alert(x.message);
                    });
                });

                const buttonMerge = document.createElement("button");
                buttonMerge.classList.add("DetailButton");
                buttonMerge.innerText = `merge`;
                divButtonGroup.appendChild(buttonMerge);
                buttonMerge.addEventListener("click", () => {

                    // Get the name root.
                    let nodeNameBase = rootNode.name;
                    while (nodeNameBase.endsWith("+")) {

                        nodeNameBase = nodeNameBase.substr(0, nodeNameBase.length - 1);
                    }

                    // Find all nodes the start with the base node name.
                    const nodesToMerge = [];
                    nodes.forEach((node) => {

                        if (node !== rootNode &&
                            node.name.startsWith(nodeNameBase)) {

                            nodesToMerge.push(node);
                        }
                    });

                    // Process each node to merge
                    nodesToMerge.forEach((mergee) => {

                        // Move over all the hook children.
                        mergee.hookeChildren.forEach((child) => {

                            if (!rootNode.hookeChildren.includes(child)) {

                                rootNode.hookeChildren.push(child);
                            }

                            // Eliminate the other side, and redirect to nodeRoot.
                            child.hookeChildren = child.hookeChildren.filter((hc) => {

                                return hc !== mergee;
                            });
                            if (!child.hookeChildren.includes(rootNode)) {

                                child.hookeChildren.push(rootNode);
                            }
                        });

                        // Move over all children.
                        mergee.children.forEach((child) => {

                            if (!rootNode.children.includes(child)) {

                                rootNode.children.push(child);
                            }
                        })

                        // Remove all the coulomb children.
                        nodes.forEach((node) => {

                            node.coulombChildren = node.coulombChildren.filter((child) => {

                                return (child !== mergee);
                            });
                        });

                        // Remove from nodes.
                        nodes = nodes.filter((node) => {

                            return (node !== mergee);
                        });
                    });

                    //////////////////////
                    // Finally, rename node to base.

                    // Update node name.
                    rootNode.name = nodeNameBase;

                    // Reselect current node.
                    selectRootNode(rootNode);
                });

                const buttonDelete = document.createElement("button");
                buttonDelete.classList.add("DetailButton");
                buttonDelete.innerText = `delete`;
                divButtonGroup.appendChild(buttonDelete);
                buttonDelete.addEventListener("click", () => {

                    // Remove from all node collections.
                    nodes.forEach((node) => {

                        node.children = node.children.filter((child) => {

                            return (child !== rootNode);
                        });
                        node.hookeChildren = node.hookeChildren.filter((child) => {

                            return (child !== rootNode);
                        });
                        node.coulombChildren = node.coulombChildren.filter((child) => {

                            return (child !== rootNode);
                        });
                    });

                    // Delete current node.
                    nodes = nodes.filter((node) => {

                        return (node !== rootNode);
                    });

                    // Make sure there is at least one node.
                    makeSureThereIsAtLeastOneNode();

                    // Choose a new root.
                    let newRoot = (rootNode.children.length ? rootNode.children[0] :
                        nodes[0]);
                    selectRootNode(newRoot);
                });
                
                const divNotes = document.createElement("div");
                divNotes.classList.add("DetailItem");
                divNotes.classList.add("FlexGrow");
                divNotes.innerText = `notes`;

                // Add editable name of the node.
                const divNote = document.createElement("div");
                divNote.classList.add("DetailItem");
                divNote.classList.add("FlexGrow");
                divNotes.appendChild(divNote);

                const inputNotes = document.createElement("TextArea");
                inputNotes.classList.add("DetailItemInputChild");
                inputNotes.classList.add("NoResize");
                inputNotes.value = `${(rootNode.notes ? rootNode.notes : "")}`;
                divNote.appendChild(inputNotes);
                inputNotes.addEventListener("input", () => {

                    // Save....
                    rootNode.notes = inputNotes.value;
                });

                divDetailsContainer.appendChild(divNotes);
                divDetailsContainer.appendChild(divButtonGroup);
            };

            // "Select" the root node.
            selectRootNode(rootNode);

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

                        loadUpDetailSectionWithClickablePills("select node:", matches,
                            (match) => {

                                // "Select" the root node.
                                selectRootNode(match);

                                translateX = canvas.width / 2 + canvas.width / 8;
                                translateY = canvas.height / 2;
                                setTransform();
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
                            Math.abs((node.position.x - rootNode.position.x) - nodeX) < 20 / scale &&
                            Math.abs((node.position.y - rootNode.position.y) - nodeY) < 20 / scale) {

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

                    nodeChild.computeNetForce(rootNode, dTotalMilliseconds / 1000);
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

                    if (nodeChild !== rootNode) {

                        nodeChild.renderLinks(context,
                            rootNode);
                    }
                });
                context.stroke();

                // Render the root node links.
                context.strokeStyle = "rgba(0, 0, 0,0.9)";
                context.beginPath();
                rootNode.renderLinks(context,
                    rootNode);
                context.stroke();

                ///////////////////////////
                // Render the nodes:

                // First, the root.
                context.fillStyle = "yellow";
                context.beginPath();
                rootNode.render(context,
                    rootNode);
                context.fill();

                // Next the parents of the root node.
                context.fillStyle = "lightblue";
                context.beginPath();
                rootParents.forEach((nodeChild) => {

                    nodeChild.render(context,
                        rootNode);
                });
                context.fill();

                // Next the children of the root node.
                context.fillStyle = "magenta";
                context.beginPath();
                rootChildren.forEach((nodeChild) => {

                    nodeChild.render(context,
                        rootNode);
                });
                context.fill();

                // Last the other nodes.
                context.fillStyle = "rgba(0,255,255, 0.25)";
                context.beginPath();
                otherNodes.forEach((nodeChild) => {

                    nodeChild.render(context,
                        rootNode);
                });
                context.fill();

                // Render the node's names.
                context.font = "20px arial";
                context.textBaseline = "middle";
                context.textAlign = "center";
                context.fillStyle = "rgba(0,0,0,0.1)";
                otherNodes.forEach((nodeChild) => {

                    nodeChild.renderName(context,
                        rootNode);
                });
                context.fillStyle = "rgba(0,0,0,0.7)";
                rootChildren.forEach((nodeChild) => {

                    nodeChild.renderName(context,
                        rootNode);
                });
                context.fillStyle = "rgba(0,0,0,0.7)";
                rootParents.forEach((nodeChild) => {

                    nodeChild.renderName(context,
                        rootNode);
                });
                context.fillStyle = "rgba(0,0,0,1)";
                rootNode.renderName(context,
                    rootNode);

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