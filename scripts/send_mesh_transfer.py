#!/usr/bin/env python
"""send_mesh_transfer.py

A command-line utility for submitting a MeshPay transfer request directly to a
MeshInternetBridge gateway, bypassing the backend API layer.

Usage:
    python send_mesh_transfer.py --authority AUTH1 --sender user1 \
        --recipient user2 --amount 100 --bridge-url http://192.168.1.142:8080

The script relies on the following environment variables as sensible defaults:
    MESH_BRIDGE_URL – Base URL of the MeshInternetBridge (default
                      "http://192.168.1.142:8080")

The tool will exit with code 0 on success and non-zero on failure, printing the
JSON response from the gateway.
"""
from __future__ import annotations

import json
import logging
import sys
from argparse import ArgumentParser, Namespace
from datetime import datetime
from os import getenv
from typing import Any, Dict, Final

import httpx

DEFAULT_BRIDGE_URL: Final[str] = getenv("MESH_BRIDGE_URL", "http://192.168.1.142:8080")


def _parse_args() -> Namespace:
    """Parse command-line arguments.

    Returns
    -------
    argparse.Namespace
        Parsed CLI arguments.
    """
    parser = ArgumentParser(description="Send MeshPay transfer via mesh gateway")
    parser.add_argument(
        "--authority",
        required=True,
        help="Name of the MeshPay authority (e.g., auth1)",
    )
    parser.add_argument(
        "--sender",
        required=True,
        help="Sender account identifier.",
    )
    parser.add_argument(
        "--recipient",
        required=True,
        help="Recipient account identifier.",
    )
    parser.add_argument(
        "--amount",
        type=int,
        required=True,
        help="Transfer amount in smallest token units.",
    )
    parser.add_argument(
        "--bridge-url",
        default=DEFAULT_BRIDGE_URL,
        help="Base URL of the MeshInternetBridge gateway.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=10.0,
        help="HTTP timeout in seconds (default: 10).",
    )
    return parser.parse_args()


def build_payload(sender: str, recipient: str, amount: int) -> Dict[str, Any]:
    """Construct the JSON payload understood by the gateway.

    Parameters
    ----------
    sender : str
        Sender account identifier.
    recipient : str
        Recipient account identifier.
    amount : int
        Amount to transfer.

    Returns
    -------
    dict
        JSON-serialisable body for the POST request.
    """
    return {
        "sender": sender,
        "recipient": recipient,
        "amount": amount,
        "timestamp": int(datetime.utcnow().timestamp()),
    }


def send_transfer(
    bridge_url: str,
    authority_name: str,
    payload: Dict[str, Any],
    timeout: float = 10.0,
) -> httpx.Response:
    """Send the transfer request to the gateway.

    Parameters
    ----------
    bridge_url : str
        Base URL of the MeshInternetBridge.
    authority_name : str
        Name of the target authority.
    payload : dict
        Transfer payload.
    timeout : float, optional
        HTTP timeout, by default 10.0 seconds.

    Returns
    -------
    httpx.Response
        The HTTP response object.
    """
    url: str = f"{bridge_url.rstrip('/')}/{authority_name}/transfer"
    logging.debug("POST %s payload=%s", url, payload)
    response: httpx.Response = httpx.post(url, json=payload, timeout=timeout)
    response.raise_for_status()
    return response


def main() -> None:
    """Entry-point for the CLI script."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    args: Namespace = _parse_args()

    payload: Dict[str, Any] = build_payload(args.sender, args.recipient, args.amount)

    try:
        response: httpx.Response = send_transfer(
            bridge_url=args.bridge_url,
            authority_name=args.authority,
            payload=payload,
            timeout=args.timeout,
        )
    except httpx.HTTPStatusError as exc:
        logging.error(
            "Request failed with status %s: %s", exc.response.status_code, exc.response.text
        )
        sys.exit(1)
    except httpx.RequestError as exc:
        logging.error("Request error: %s", exc)
        sys.exit(1)

    logging.info("Transfer succeeded: %s", response.text)
    # Pretty-print JSON if possible.
    try:
        parsed = response.json()
        print(json.dumps(parsed, indent=2))
    except ValueError:
        # Not JSON – print raw text.
        print(response.text)


if __name__ == "__main__":
    main() 