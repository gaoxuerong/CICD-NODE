<template>
  <div>
    <h1 style="margin-bottom: 16px">帮助中心</h1>

    <el-card>
      <el-collapse v-model="activeNames">
        <el-collapse-item title="如何创建项目？" name="1">
          <p>1. 点击左侧菜单「项目」进入项目列表页面</p>
          <p>2. 点击右上角「创建项目」按钮</p>
          <p>3. 填写项目名称、描述、仓库地址等信息</p>
          <p>4. 点击「确定」完成创建</p>
        </el-collapse-item>
        <el-collapse-item title="如何配置流水线？" name="2">
          <p>1. 进入项目详情或流水线列表</p>
          <p>2. 点击「创建流水线」</p>
          <p>3. 选择所属项目并填写流水线名称</p>
          <p>4. 在配置区域编写 YAML 配置</p>
          <p>5. 保存后即可触发构建</p>
        </el-collapse-item>
        <el-collapse-item title="如何管理环境变量？" name="3">
          <p>1. 点击左侧菜单「环境」</p>
          <p>2. 创建开发、测试、生产等环境</p>
          <p>3. 在环境详情中配置变量</p>
          <p>4. 流水线中可引用对应环境的变量</p>
        </el-collapse-item>
        <el-collapse-item title="如何管理团队成员？" name="4">
          <p>1. 进入项目详情</p>
          <p>2. 点击「成员管理」</p>
          <p>3. 添加成员并分配角色（开发者/维护者/访客）</p>
          <p>4. 系统管理员可管理所有用户和角色</p>
        </el-collapse-item>
        <el-collapse-item title="遇到问题怎么办？" name="5">
          <p>1. 检查网络连接是否正常</p>
          <p>2. 查看构建日志定位问题</p>
          <p>3. 联系系统管理员获取帮助</p>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeNames = ref(['1'])
</script>
