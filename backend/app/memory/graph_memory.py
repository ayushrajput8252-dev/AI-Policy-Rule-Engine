"""Graph-structured memory — relationships that span agents: which role a
candidate was screened for, which team/project they're being considered
for, which other candidates applied to the same role.

Nodes/edges persist as rows in SQLite (GraphNode/GraphEdge, same primary DB
as global memory) and get loaded into a networkx.DiGraph on demand for
traversal — networkx was already a backend dependency (used by fraud
identity clustering) so this adds no new infra.
"""
import uuid
from typing import Optional

import networkx as nx

from ..database import SessionLocal
from ..models import GraphEdge, GraphNode


def add_node(node_id: str, node_type: str, label: str, properties: Optional[dict] = None) -> None:
    db = SessionLocal()
    try:
        node = db.get(GraphNode, node_id)
        if node is None:
            node = GraphNode(id=node_id, type=node_type, label=label, properties=properties or {})
            db.add(node)
        else:
            node.label = label
            if properties:
                node.properties = {**(node.properties or {}), **properties}
        db.commit()
    finally:
        db.close()


def add_edge(source_id: str, target_id: str, relation: str, properties: Optional[dict] = None) -> None:
    db = SessionLocal()
    try:
        existing = (
            db.query(GraphEdge)
            .filter(GraphEdge.source_id == source_id, GraphEdge.target_id == target_id, GraphEdge.relation == relation)
            .first()
        )
        if existing:
            return
        edge = GraphEdge(id=str(uuid.uuid4()), source_id=source_id, target_id=target_id, relation=relation, properties=properties or {})
        db.add(edge)
        db.commit()
    finally:
        db.close()


def get_related(entity_id: str, depth: int = 1) -> dict:
    """Returns the subgraph reachable from entity_id within `depth` hops, as
    plain dicts (nodes + edges) — e.g. for a candidate: their role, and
    other candidates who share that role."""
    db = SessionLocal()
    try:
        nodes = {n.id: n for n in db.query(GraphNode).all()}
        edges = db.query(GraphEdge).all()

        g = nx.DiGraph()
        for n in nodes.values():
            g.add_node(n.id, type=n.type, label=n.label, **(n.properties or {}))
        for e in edges:
            g.add_edge(e.source_id, e.target_id, relation=e.relation, **(e.properties or {}))

        if entity_id not in g:
            return {"nodes": [], "edges": []}

        undirected = g.to_undirected()
        reachable = nx.single_source_shortest_path_length(undirected, entity_id, cutoff=depth)
        sub_nodes = list(reachable.keys())
        subgraph = g.subgraph(sub_nodes)

        return {
            "nodes": [{"id": n, **d} for n, d in subgraph.nodes(data=True)],
            "edges": [{"source": u, "target": v, **d} for u, v, d in subgraph.edges(data=True)],
        }
    finally:
        db.close()
