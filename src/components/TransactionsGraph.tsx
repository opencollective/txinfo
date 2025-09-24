import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Transaction } from "../types";
import { useNostr } from "@/providers/NostrProvider";
import { generateURI } from "@/lib/utils";

const TransactionGraph = ({
  chainId,
  transactions,
  showUsers = true,
  minUserTx = 3,
  minBusinessTx = 5,
  width = 800,
  height = 600,
}: {
  chainId: number;
  transactions: Transaction[];
  showUsers?: boolean;
  minUserTx?: number;
  minBusinessTx?: number;
  width?: number;
  height?: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const selectedNodeRef = useRef(null);

  const { notesByURI } = useNostr();

  useEffect(() => {
    if (!transactions || !transactions.length) return;

    const processData = () => {
      const now = new Date();

      const nodeMap = new Map();
      const linkMap = new Map();

      transactions.forEach((tx) => {
        const fromURI = generateURI("ethereum", { chainId, address: tx.from });
        const fromNote = notesByURI[fromURI];
        const fromProfile = fromNote ? JSON.parse(fromNote.content) : {};
        const toURI = generateURI("ethereum", { chainId, address: tx.to });
        const toNote = notesByURI[toURI];
        const toProfile = toNote ? JSON.parse(toNote.content) : {};

        const fromNodeData = {
          id: tx.from,
          type: tx.from_type || "user",
          name: fromProfile.name || tx.from_name || tx.from,
          picture: fromProfile.picture,
        };
        const toNodeData = {
          id: tx.to,
          type: tx.to_type || "user",
          name: toProfile.name || tx.to_name || tx.to,
          picture: toProfile.picture,
        };

        [fromNodeData, toNodeData].forEach((node) => {
          if (!nodeMap.has(node.id)) {
            nodeMap.set(node.id, {
              id: node.id,
              name: node.name,
              picture: node.picture,
              type: node.type,
              inTx: 0,
              outTx: 0,
              volume: 0,
              counterparties: new Set(),
              firstTx: new Date(tx.timestamp),
              lastTx: new Date(tx.timestamp),
            });
          }
          const nodeData = nodeMap.get(node.id);
          const txDate = new Date(tx.timestamp);
          nodeData.lastTx = new Date(Math.max(nodeData.lastTx, txDate));
          nodeData.firstTx = new Date(Math.min(nodeData.firstTx, txDate));
        });

        const amount = parseFloat(tx.value);
        const fromNode = nodeMap.get(tx.from);
        const toNode = nodeMap.get(tx.to);
        fromNode.outTx++;
        toNode.inTx++;
        fromNode.volume += amount;
        toNode.volume += amount;
        fromNode.counterparties.add(tx.to);
        toNode.counterparties.add(tx.from);

        const linkId = `${tx.from}-${tx.to}`;
        if (!linkMap.has(linkId)) {
          linkMap.set(linkId, {
            source: tx.from,
            target: tx.to,
            value: 0,
            transactions: 0,
          });
        }
        const link = linkMap.get(linkId);
        link.value += amount;
        link.transactions++;
      });

      const nodes = Array.from(nodeMap.values()).filter((node) => {
        if (node.type === "user") {
          return showUsers && node.outTx >= minUserTx;
        }
        return node.inTx >= minBusinessTx;
      });

      const visibleNodeIds = new Set(nodes.map((n) => n.id));
      const links = Array.from(linkMap.values()).filter(
        (link) =>
          visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
      );

      return { nodes, links };
    };

    const { nodes, links } = processData();
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    nodes.forEach((node: any) => {
      if (node.picture) {
        defs
          .append("pattern")
          .attr("id", `pattern-${node.id.replace(/[^a-zA-Z0-9]/g, "-")}`)
          .attr("height", 1)
          .attr("width", 1)
          .attr("patternContentUnits", "objectBoundingBox")
          .append("image")
          .attr("height", 1)
          .attr("width", 1)
          .attr("preserveAspectRatio", "xMidYMid slice")
          .attr("xlink:href", node.picture);
      }
    });

    const linkValueExtent = d3.extent(links, (d) => d.value);
    const linkWidthScale = d3.scaleSqrt().range([2, 20]);
    if (linkValueExtent[0] !== undefined) {
      linkWidthScale.domain(linkValueExtent as [number, number]);
    }

    const nodeRadius = (d: any) =>
      Math.max(5, Math.sqrt(d.type === "user" ? d.outTx : d.inTx) * 2);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .force(
        "collision",
        d3.forceCollide().radius((d) => nodeRadius(d) + 2)
      );

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => linkWidthScale(d.value));

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", nodeRadius)
      .attr("fill", (d) => {
        if (d.picture) {
          return `url(#pattern-${d.id.replace(/[^a-zA-Z0-9]/g, "-")})`;
        }
        return d.type === "user" ? "#f59e0b" : "#2563eb";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .call(drag(simulation));

    node.append("title").text((d: any) => d.name);

    const handleNodeClick = (event: MouseEvent, d: any) => {
      if (selectedNodeRef.current === d) {
        selectedNodeRef.current = null;
        d3.selectAll("circle").attr("opacity", 1);
        d3.selectAll("line").attr("opacity", 0.6);
      } else {
        selectedNodeRef.current = d;
        const connectedNodes = new Set();
        links.forEach((link) => {
          if (link.source.id === d.id) connectedNodes.add(link.target.id);
          if (link.target.id === d.id) connectedNodes.add(link.source.id);
        });

        d3.selectAll("circle").attr("opacity", (n) =>
          n === d || connectedNodes.has(n.id) ? 1 : 0.1
        );
        d3.selectAll("line").attr("opacity", (l) =>
          l.source.id === d.id || l.target.id === d.id ? 0.6 : 0.1
        );
      }
    };

    node.on("click", handleNodeClick);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
  }, [
    transactions,
    showUsers,
    minUserTx,
    minBusinessTx,
    width,
    height,
    notesByURI,
  ]);

  return (
    <div style={{ width, height }}>
      <svg ref={svgRef} width={width} height={height}></svg>
    </div>
  );
};

export default TransactionGraph;
