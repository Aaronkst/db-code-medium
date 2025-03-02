import React, { memo } from "react";
import { BaseEdge, BezierEdge, type EdgeProps } from "@xyflow/react";

function SelfConnectingComponent(props: EdgeProps) {
  // we are using the default bezier edge when source and target ids are different
  if (props.source !== props.target) {
    return <BezierEdge {...props} />;
  }

  const { sourceX, sourceY, targetX, targetY, id, markerEnd } = props;
  const radiusX = (sourceX - targetX) * 0.7;
  const radiusY = 120;
  const edgePath = `M ${sourceX - 5} ${sourceY} A ${radiusX} ${radiusY} 0 1 0 ${
    targetX + 2
  } ${targetY}`;

  return <BaseEdge style={props.style} path={edgePath} markerEnd={markerEnd} />;
}

SelfConnectingComponent.displayName = "SelfConnectingEdge";

export const SelfConnection = memo(SelfConnectingComponent);
