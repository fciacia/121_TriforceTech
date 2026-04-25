import matplotlib.pyplot as plt
import networkx as nx

def draw_graph(G):
    print("✅ draw_graph.py LOADED - LAYERED EDGE VERSION")
    print("GRAPH NODES:", list(G.nodes()))
    print("GRAPH EDGES:", [(u, v, d.get("relation")) for u, v, d in G.edges(data=True)])

    plt.figure(figsize=(20, 12))

    # =========================
    # 1. FULLY MANUAL POSITIONS
    # =========================
    pos = {
        "SME":    (0, 0),
        "NEWS_0": (0, 2),

        # Contracted suppliers (yellow)
        "SUP_A": (-3, 3),
        "SUP_B": (-3, 1),
        "SUP_E": (-3, -1),
        "SUP_F": (-3, -3),
        "SUP_I": (-3, -5),

        # Alternative suppliers (orange)
        "SUP_C": (-6, 4),
        "SUP_D": (-6, 2),
        "SUP_G": (-6, 0),
        "SUP_H": (-6, -2),
        "SUP_J": (-6, -4),

        # Regulations (top)
        "R1": (-4, 6),
        "R2": (-2, 6),
        "R3": (0,  6),
        "R4": (2,  6),
        "R5": (4,  6),

        # Loan tiers (right)
        "Tier1_Green":       (4, 2),
        "Tier2_Sustainable": (4, 0),
        "Tier3_Standard":    (4, -2),
    }

    # fallback for unexpected nodes
    for node in G.nodes():
        if node not in pos:
            pos[node] = (0, -7)
            print(f"⚠️ UNMAPPED NODE: {node} — placed at fallback position")

    # =========================
    # 2. COLOR LOGIC
    # =========================
    contracted = {"SUP_A", "SUP_B", "SUP_E", "SUP_F", "SUP_I"}
    tier_nodes = {"Tier1_Green", "Tier2_Sustainable", "Tier3_Standard"}
    reg_nodes  = {"R1", "R2", "R3", "R4", "R5"}

    node_colors = []
    for node in G.nodes():
        if node == "SME":
            node_colors.append("dodgerblue")
        elif node in contracted:
            node_colors.append("gold")
        elif str(node).startswith("SUP_"):
            node_colors.append("orange")
        elif node in reg_nodes:
            node_colors.append("limegreen")
        elif node in tier_nodes:
            node_colors.append("red")
        elif str(node).startswith("NEWS_"):
            node_colors.append("violet")
        else:
            node_colors.append("gray")

    # =========================
    # 3. DRAW EDGES IN LAYERS
    # =========================

    # Layer 1 — available_to (light gray, background)
    available_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("relation") == "available_to"]
    nx.draw_networkx_edges(G, pos, edgelist=available_edges,
                           edge_color="lightgray", alpha=0.5,
                           arrows=True, arrowsize=12, width=1.0)

    # Layer 2 — contracts_with (gold)
    contract_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("relation") == "contracts_with"]
    nx.draw_networkx_edges(G, pos, edgelist=contract_edges,
                           edge_color="goldenrod", alpha=0.9,
                           arrows=True, arrowsize=15, width=2.0)

    # Layer 3 — governs (green)
    govern_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("relation") == "governs"]
    nx.draw_networkx_edges(G, pos, edgelist=govern_edges,
                           edge_color="limegreen", alpha=0.9,
                           arrows=True, arrowsize=15, width=2.5)

    # Layer 4 — eligible_for (red)
    eligible_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("relation") == "eligible_for"]
    nx.draw_networkx_edges(G, pos, edgelist=eligible_edges,
                           edge_color="red", alpha=0.9,
                           arrows=True, arrowsize=15, width=2.0)

    # Layer 5 — affects (violet, on top)
    affects_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("relation") == "affects"]
    nx.draw_networkx_edges(G, pos, edgelist=affects_edges,
                           edge_color="violet", alpha=1.0,
                           arrows=True, arrowsize=18, width=2.5)

    # =========================
    # 4. DRAW NODES AND LABELS
    # =========================
    nx.draw_networkx_nodes(G, pos,
                           node_color=node_colors,
                           node_size=2500,
                           edgecolors="black",
                           linewidths=1.5)
    nx.draw_networkx_labels(G, pos,
                            font_size=8,
                            font_weight="bold")

    # =========================
    # 5. LEGEND
    # =========================
    legend_elements = [
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='dodgerblue', markersize=13, label='SME'),
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='gold',       markersize=13, label='Contracted Supplier'),
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='orange',     markersize=13, label='Alternative Supplier'),
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='limegreen',  markersize=13, label='Regulation'),
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='red',        markersize=13, label='Loan Tier'),
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='violet',     markersize=13, label='News Event'),
        plt.Line2D([0], [0], color='goldenrod',  linewidth=2, label='contracts_with'),
        plt.Line2D([0], [0], color='lightgray',  linewidth=2, label='available_to'),
        plt.Line2D([0], [0], color='red',        linewidth=2, label='eligible_for'),
        plt.Line2D([0], [0], color='violet',     linewidth=2, label='affects'),
        plt.Line2D([0], [0], color='limegreen',  linewidth=2, label='governs'),
    ]
    plt.legend(handles=legend_elements, loc='lower left', fontsize=8, framealpha=0.9)

    # =========================
    # 6. VIEWPORT
    # =========================
    plt.title("ESG GraphRAG — Supply Chain Knowledge Graph", fontsize=14, pad=20)
    plt.axis("off")
    plt.xlim(-8, 6)
    plt.ylim(-7, 8)
    plt.tight_layout()
    plt.show()