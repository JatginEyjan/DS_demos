#!/bin/bash
# DS10 快速测试脚本
# 使用方法: ./test-ds10.sh

echo "=========================================="
echo "      DS10 部署前测试脚本 v1.0"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 切换到项目目录
cd /home/admin/.openclaw/workspace-codeMaster/DS_Demo/DS10

# 计数器
ERRORS=0
WARNINGS=0

echo "📋 开始测试..."
echo ""

# 1. 检查文件是否存在
echo "1️⃣  检查文件..."
if [ -f "index.html" ]; then
    echo -e "${GREEN}✅ index.html 存在${NC}"
else
    echo -e "${RED}❌ index.html 不存在${NC}"
    ERRORS=$((ERRORS+1))
fi

# 2. 检查基本语法（通过能否被grep处理来判断）
echo ""
echo "2️⃣  检查语法..."
if grep -q "<script>" index.html && grep -q "</script>" index.html; then
    echo -e "${GREEN}✅ script标签完整${NC}"
else
    echo -e "${RED}❌ script标签可能不完整${NC}"
    ERRORS=$((ERRORS+1))
fi

# 3. 检查重复函数定义
echo ""
echo "3️⃣  检查重复函数..."
DUPLICATES=$(grep "^function " index.html 2>/dev/null | sort | uniq -d)
if [ -z "$DUPLICATES" ]; then
    echo -e "${GREEN}✅ 无重复函数定义${NC}"
else
    echo -e "${RED}❌ 发现重复函数:${NC}"
    echo "$DUPLICATES" | while read line; do
        echo "   - $line"
    done
    ERRORS=$((ERRORS+1))
fi

# 4. 检查核心函数是否存在且唯一
echo ""
echo "4️⃣  检查核心函数..."
CORE_FUNCS=("startGame" "enterRoom" "executeAction" "selectObject" "performRoll" "updateStatus")
for func in "${CORE_FUNCS[@]}"; do
    COUNT=$(grep -c "^function $func" index.html 2>/dev/null || echo "0")
    if [ "$COUNT" -eq 1 ]; then
        echo -e "${GREEN}✅ $func${NC}"
    elif [ "$COUNT" -eq 0 ]; then
        echo -e "${RED}❌ $func 缺失${NC}"
        ERRORS=$((ERRORS+1))
    else
        echo -e "${RED}❌ $func 重复定义 ($COUNT 次)${NC}"
        ERRORS=$((ERRORS+1))
    fi
done

# 5. 检查v0.3+新函数
echo ""
echo "5️⃣  检查v0.3+新功能..."
NEW_FUNCS=("updateProfile" "recordRoomResidue" "checkAndTriggerEchoes")
for func in "${NEW_FUNCS[@]}"; do
    if grep -q "^function $func" index.html; then
        echo -e "${GREEN}✅ $func${NC}"
    else
        echo -e "${YELLOW}⚠️  $func 不存在${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
done

# 6. 检查文件大小
echo ""
echo "6️⃣  检查文件大小..."
if [ -f "index.html" ]; then
    SIZE=$(stat -f%z index.html 2>/dev/null || stat -c%s index.html 2>/dev/null)
    SIZE_KB=$((SIZE / 1024))
    if [ "$SIZE_KB" -gt 500 ]; then
        echo -e "${YELLOW}⚠️  文件较大: ${SIZE_KB}KB${NC}"
        WARNINGS=$((WARNINGS+1))
    else
        echo -e "${GREEN}✅ 文件大小正常: ${SIZE_KB}KB${NC}"
    fi
fi

# 7. 检查关键变量定义
echo ""
echo "7️⃣  检查关键变量..."
VARS=("var rooms" "var objectTemplates" "var professions" "var profile" "var roomResidues" "var globalMemory")
for var in "${VARS[@]}"; do
    if grep -q "$var" index.html; then
        echo -e "${GREEN}✅ $var${NC}"
    else
        echo -e "${YELLOW}⚠️  $var 未定义${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
done

# 8. 检查HTML结构
echo ""
echo "8️⃣  检查HTML结构..."
if grep -q "<!DOCTYPE html>" index.html && grep -q "</html>" index.html; then
    echo -e "${GREEN}✅ HTML结构完整${NC}"
else
    echo -e "${RED}❌ HTML结构不完整${NC}"
    ERRORS=$((ERRORS+1))
fi

# 9. 检查常见错误
echo ""
echo "9️⃣  检查常见错误..."

# 检查未闭合的括号
UNMATCHED=$(grep -o '(' index.html | wc -l)
UNCLOSED=$(grep -o ')' index.html | wc -l)
if [ "$UNMATCHED" -eq "$UNCLOSED" ]; then
    echo -e "${GREEN}✅ 括号匹配${NC}"
else
    echo -e "${YELLOW}⚠️  括号可能不匹配: ($UNMATCHED vs $UNCLOSED)${NC}"
    WARNINGS=$((WARNINGS+1))
fi

# 检查结果
echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ 测试通过！可以部署${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  有 $WARNINGS 个警告，建议检查${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ 测试失败！发现 $ERRORS 个错误${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  另有 $WARNINGS 个警告${NC}"
    fi
    echo ""
    echo "请先修复错误再部署"
    exit 1
fi
