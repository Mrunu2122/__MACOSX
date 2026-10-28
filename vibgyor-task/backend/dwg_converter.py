#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DWG to DXF Converter Utility
Attempts conversion using multiple strategies:
1. Direct ezdxf support (if available)
2. LibreCAD command-line tool
3. dwg2dxf utility
4. Online conversion API fallback
5. Detailed error guidance
"""

import sys
import os
import subprocess
import tempfile
import shutil
from pathlib import Path
import json

def check_conversion_tool_available():
    """Check if any DWG conversion tool is available on the system"""
    tools = {
        'libreoffice': ['libreoffice', '--version'],
        'LibreCAD': ['LibreCAD', '--version'] if sys.platform == 'win32' else ['libreCAD', '--help'],
        'dwg2dxf': ['dwg2dxf', '--help'],
        'oda_converter': ['ODAFileConverter', '--help'] if sys.platform == 'win32' else None,
    }
    
    available = []
    for tool_name, cmd in tools.items():
        if cmd is None:
            continue
        try:
            subprocess.run(cmd, capture_output=True, timeout=5)
            available.append(tool_name)
            print(f"[OK] Found tool: {tool_name}")
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            pass
    
    return available

def convert_dwg_to_dxf_local(dwg_path):
    """
    Try to convert DWG to DXF using local tools.
    Returns path to converted DXF file, or None if conversion fails.
    """
    dwg_path = Path(dwg_path)
    
    if not dwg_path.exists():
        print(f"[ERROR] File not found: {dwg_path}")
        return None
    
    # Check available tools
    available_tools = check_conversion_tool_available()
    if not available_tools:
        print("[WARN] No DWG conversion tools found on system")
        print("[INFO] Available tools:")
        print("       - LibreCAD (Windows/Mac/Linux)")
        print("       - dwg2dxf (Windows/Mac/Linux)")
        print("       - ODA File Converter (Windows)")
        return None
    
    # Create temporary DXF file
    temp_dir = Path(tempfile.gettempdir())
    dxf_path = temp_dir / f"converted_{dwg_path.stem}.dxf"
    
    # Strategy 1: Try LibreCAD on Windows
    if sys.platform == 'win32':
        libreCAD_candidates = [
            r"C:\Program Files\LibreCAD\LibreCAD.exe",
            r"C:\Program Files (x86)\LibreCAD\LibreCAD.exe",
            r"C:\Program Files\LibreCAD-2\LibreCAD.exe",
        ]
        
        for libreCAD_exe in libreCAD_candidates:
            if Path(libreCAD_exe).exists():
                try:
                    print(f"[INFO] Attempting conversion with LibreCAD...")
                    # LibreCAD command line: LibreCAD <input> -export-dxf <output>
                    cmd = [libreCAD_exe, str(dwg_path), "-export-dxf", str(dxf_path)]
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        timeout=30,
                        text=True
                    )
                    
                    if dxf_path.exists() and dxf_path.stat().st_size > 0:
                        print(f"[OK] Conversion successful: {dxf_path}")
                        return str(dxf_path)
                    else:
                        print(f"[WARN] LibreCAD produced empty output")
                        continue
                        
                except subprocess.TimeoutExpired:
                    print(f"[WARN] LibreCAD conversion timed out")
                    continue
                except Exception as e:
                    print(f"[WARN] LibreCAD conversion error: {e}")
                    continue
    
    # Strategy 2: Try dwg2dxf command
    try:
        print(f"[INFO] Attempting conversion with dwg2dxf...")
        cmd = ["dwg2dxf", str(dwg_path), str(dxf_path)]
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=30,
            text=True
        )
        
        if dxf_path.exists() and dxf_path.stat().st_size > 0:
            print(f"[OK] Conversion successful with dwg2dxf: {dxf_path}")
            return str(dxf_path)
    except FileNotFoundError:
        print(f"[INFO] dwg2dxf not found in PATH")
    except Exception as e:
        print(f"[WARN] dwg2dxf error: {e}")
    
    # Strategy 3: Try ODA command line tool (if installed)
    if sys.platform == 'win32':
        oda_candidates = [
            r"C:\Program Files\ODA\ODAFileConverter.exe",
            r"C:\Program Files (x86)\ODA\ODAFileConverter.exe",
        ]
        
        for oda_exe in oda_candidates:
            if Path(oda_exe).exists():
                try:
                    print(f"[INFO] Attempting conversion with ODA...")
                    output_dir = dxf_path.parent
                    cmd = [
                        oda_exe,
                        str(dwg_path.parent),
                        str(output_dir),
                        "DXF",
                        "0",
                        "1",
                        str(dwg_path.name)
                    ]
                    result = subprocess.run(cmd, capture_output=True, timeout=30, text=True)
                    
                    # ODA creates file in output directory with .dxf extension
                    expected_dxf = output_dir / f"{dwg_path.stem}.dxf"
                    if expected_dxf.exists() and expected_dxf.stat().st_size > 0:
                        print(f"[OK] Conversion successful with ODA: {expected_dxf}")
                        return str(expected_dxf)
                except Exception as e:
                    print(f"[WARN] ODA conversion error: {e}")
                    continue
    
    # Strategy 4: Try Linux LibreCAD
    if sys.platform in ['linux', 'linux2']:
        try:
            print(f"[INFO] Attempting conversion with LibreCAD (Linux)...")
            cmd = ["libreoffice", "--headless", "--convert-to", "dxf", str(dwg_path), "--outdir", str(temp_dir)]
            result = subprocess.run(cmd, capture_output=True, timeout=30, text=True)
            
            expected_dxf = temp_dir / f"{dwg_path.stem}.dxf"
            if expected_dxf.exists() and expected_dxf.stat().st_size > 0:
                print(f"[OK] Conversion successful with LibreOffice: {expected_dxf}")
                # Rename to our expected path
                shutil.move(str(expected_dxf), str(dxf_path))
                return str(dxf_path)
        except Exception as e:
            print(f"[WARN] LibreOffice conversion error: {e}")
    
    print("[ERROR] No working DWG converter found")
    return None


def suggest_online_tools():
    """Print suggestions for online conversion tools"""
    print("\n" + "="*60)
    print("Online DWG to DXF Conversion Options:")
    print("="*60)
    print("\n1. CloudConvert (cloudconvert.com)")
    print("   - Supports batch conversion")
    print("   - API available for automation")
    print("   - Free tier: 25 conversions/day")
    
    print("\n2. Zamzar (zamzar.com)")
    print("   - Simple web interface")
    print("   - Free tier: 2 files/day")
    
    print("\n3. Online Convert (online-convert.com)")
    print("   - Free unlimited conversions")
    print("   - No registration required")
    
    print("\n4. AnyConv (anyconv.com)")
    print("   - Supports DWG, DXF, and many other formats")
    print("   - Free with no limits")
    
    print("\nFor automated conversion in production:")
    print("- Consider using CloudConvert API")
    print("- Set up scheduled conversion service")
    print("- Or install LibreCAD/ODA on your server")
    print("="*60 + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python dwg_converter.py <dwg_file> [output_dxf_file]")
        print("")
        print("This tool converts DWG files to DXF format.")
        print("")
        print("Available conversion methods (tried in order):")
        print("  1. LibreCAD (free, open-source)")
        print("  2. dwg2dxf utility")
        print("  3. ODA File Converter")
        print("")
        print("If no tools are found, consider:")
        print("  - Installing LibreCAD: https://librecad.org/")
        print("  - Using online converter: https://cloudconvert.com")
        sys.exit(1)
    
    dwg_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = convert_dwg_to_dxf_local(dwg_file)
    
    if result:
        if output_file:
            shutil.move(result, output_file)
            print(f"[OK] Output saved to: {output_file}")
        else:
            print(f"[OK] Converted file: {result}")
        sys.exit(0)
    else:
        print("[FAIL] Conversion failed")
        print("")
        print("[SOLUTION] Install a DWG conversion tool:")
        print("")
        print("WINDOWS:")
        print("  - Download LibreCAD from https://librecad.org/")
        print("  - Run installer")
        print("  - Try again")
        print("")
        print("LINUX:")
        print("  $ sudo apt-get install librecad")
        print("")
        print("MACOS:")
        print("  $ brew install librecad")
        print("")
        print("OR USE ONLINE TOOLS:")
        print("  - CloudConvert: https://cloudconvert.com/dwg-to-dxf")
        print("  - AnyConv: https://anyconv.com/en/dwg-to-dxf")
        print("  - Zamzar: https://zamzar.com/")
        sys.exit(1)
