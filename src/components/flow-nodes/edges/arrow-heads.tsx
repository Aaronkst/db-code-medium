export function MarkerOne() {
  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <defs>
        <marker
          id="marker-one"
          viewBox="0 0 40 40"
          markerHeight={20}
          markerWidth={20}
          refX={0}
          refY={20}
        >
          <path
            d="M 20 5 20 35"
            stroke="#FF0072"
            strokeWidth="2"
            fill="white"
          />
          <path
            d="M 30 5 30 35"
            stroke="#FF0072"
            strokeWidth="2"
            fill="white"
          />
        </marker>
      </defs>
    </svg>
  );
}

export function MarkerManyStart() {
  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <defs>
        <marker
          id="marker-many-start"
          viewBox="0 0 40 40"
          markerHeight={20}
          markerWidth={20}
          refX={10}
          refY={20}
        >
          <circle
            cx="27"
            cy="20"
            r="8"
            stroke="#FF0072"
            strokeWidth="2"
            fill="white"
          />
          <path
            d="M 20 20 0 35"
            stroke="#FF0072"
            strokeWidth="2"
            fill="white"
          />
          <path
            d="M 20 20 0 20"
            stroke="#FF0072"
            strokeWidth="2"
            fill="white"
          />
          <path d="M 20 20 0 5" stroke="#FF0072" strokeWidth="2" fill="white" />
        </marker>
      </defs>
    </svg>
  );
}

export function MarkerManyEnd() {
  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <defs>
        <marker
          id="marker-many-end"
          viewBox="0 0 40 40"
          markerHeight={20}
          markerWidth={20}
          refX={30}
          refY={20}
        >
          <circle
            cx="13"
            cy="20"
            r="8"
            stroke="#FF0072"
            strokeWidth="2"
            fill="white"
          />
          <path
            d="M 20 20 40 35"
            stroke="#FF0072"
            strokeWidth="2"
            fill="white"
          />
          <path
            d="M 20 20 40 20"
            stroke="#FF0072"
            strokeWidth="2"
            fill="white"
          />
          <path
            d="M 20 20 40 5"
            stroke="#FF0072"
            strokeWidth="2"
            fill="white"
          />
        </marker>
      </defs>
    </svg>
  );
}
