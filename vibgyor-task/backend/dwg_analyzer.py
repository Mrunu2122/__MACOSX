#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DWG File Analyzer
Analyzes DWG/DXF files to help troubleshoot format issues
"""

import sys
from pathlib import Path


def analyze_file(file_path):
    """Analyze file format and content"""
    file_path = Path(file_path)
    
    if not file_path.exists():
        print(f"[ERROR] File not found: {file_path}")
        return False
    
    print(f"[INFO] Analyzing file: {file_path}")
    print(f"[INFO] File size: {file_path.stat().st_size} bytes")
    print(f"[INFO] File extension: {file_path.suffix}")
    
    # Read first 1000 bytes to analyze
    try:
        with open(file_path, 'rb') as f:
            binary_data = f.read(1000)
        
        # Try to decode as text
        text_data = binary_data.decode('latin1', errors='ignore')
        
        print("\n[ANALYSIS] First 500 characters:")
        print("=" * 60)
        print(text_data[:500])
        print("=" * 60)
        
        # Check for DXF signatures
        if 'SECTION' in text_data:
            print("\n✓ Found DXF signature: 'SECTION'")
            is_dxf = True
        elif 'ENDSEC' in text_data:
            print("\n✓ Found DXF signature: 'ENDSEC'")
            is_dxf = True
        elif text_data.strip().startswith('  0'):
            print("\n✓ Found DXF group code: '  0'")
            is_dxf = True
        else:
            is_dxf = False
        
        # Check for DWG signatures
        if binary_data.startswith(b'AC1'):
            print("✓ Found DWG signature: 'AC1' header")
            is_dwg = True
        else:
            is_dwg = False
        
        # Summary
        print("\n[RESULT]")
        print(f"  File appears to be DXF: {is_dxf}")
        print(f"  File appears to be DWG: {is_dwg}")
        
        if is_dxf and not is_dwg:
            print("\n[RECOMMENDATION]")
            print(f"  This file is DXF format but has {file_path.suffix} extension")
            print(f"  Solution: Rename to .dxf and upload again")
            print(f"  Command: ren '{file_path.name}' '{file_path.stem}.dxf'")
        elif is_dwg:
            print("\n[RECOMMENDATION]")
            print("  This is a real DWG file (AutoCAD binary format)")
            print("  Requires conversion tool to process")
            print("  Install LibreCAD or use online converter")
        else:
            print("\n[WARNING]")
            print("  Could not determine file format")
            print("  File may be corrupted or in unknown format")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Error analyzing file: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python dwg_analyzer.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    success = analyze_file(file_path)
    sys.exit(0 if success else 1)
