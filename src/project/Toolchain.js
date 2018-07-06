
import File from '../util/File'
import * as sh from "shelljs"
import Assert from 'assert'
import {GetLogger} from '../Log'
import {Paths} from "../Config"
import * as Tmp from 'tmp'
import {processTemplate} from "../util/Template"
import {getValue} from "typeguard"
import {isDefined} from "../util/Checker"


const log = GetLogger(__filename)

/**
 * Required tool
 *
 * @param toolPath
 * @returns {*}
 */
function requiredTool(toolPath) {
  if (!File.exists(toolPath)) {
    const altToolPath = sh.which(toolPath)
    if (!File.exists(altToolPath))
      throw `Unable to find tool: ${altToolPath}`
    
    toolPath = altToolPath
  }
  
  return toolPath
}


/**
 * Toolchain
 */
export default class Toolchain {
  
  /**
   * Create the host toolchain
   */
  static makeHostToolchain(triplet) {
    return new Toolchain(triplet)
  }
  
  
  constructor(triplet,toolchainFileOrObject = null, androidOpts = null) {
    this.android = androidOpts !== null
    this.androidOpts = androidOpts
    this.triplet = triplet
    if (toolchainFileOrObject && typeof toolchainFileOrObject === 'object') {
      this.file =  toolchainFileOrObject.file
      this.name = toolchainFileOrObject.name
    } else {
      this.file = toolchainFileOrObject
    }
    
    this.file = this.file || getValue(() => androidOpts.CMAKE_TOOLCHAIN_FILE)
    
    if (this.file) {
      this.file = this.file.startsWith("/") ? this.file : `${sh.pwd()}/${this.file}`
    }
  }
  
  
  
  toBuildStamp() {
    return {
      triplet: this.triplet.toString(),
      file: this.file
    }
  }
  
  
  
  
  /**
   * Create toolchain environment config
   * from cmake toolchain export
   *
   * @returns {*}
   */
  toScriptEnvironment() {
    if (!this.file)
      return {}
    
    // noinspection JSCheckFunctionSignatures
    const
      outputFile = `${sh.tempdir()}/toolchain.properties`,
      toolchainArgs = Object.entries(this.androidOpts || {})
        .map(([key,value]) => `-D${key}=${value}`),
      cmakeContext = {
        toolchainFile: this.file,
        android: isDefined(this.androidOpts)
      },
      cmakeToolchainTmpFile = Tmp.fileSync({mode: 777, prefix: `${this.toString()}-`, postfix: '.cmake'})
  
    sh.exec(`chmod 777 ${cmakeToolchainTmpFile.name}`)
    processTemplate(File.readAsset("cunit.toolchain.cmake.hbs"),cmakeContext,cmakeToolchainTmpFile.name)
    
    sh.env["CUNIT_EXPORT_FILE"] = outputFile
    
    const result = sh.exec(`${Paths.CMake} -DCUNIT_TOOLCHAIN_EXPORT=ON ${toolchainArgs.join(" ")} -P ${cmakeToolchainTmpFile.name}`)
    Assert.ok(result.code === 0,`Failed to get toolchain export: ${outputFile}`)
    
    sh.env["CUNIT_EXPORT_FILE"] = null
    
    const
      props = File.readFileProperties(outputFile)
    
    const
      makeCrossTool = (name,optional = false) => {
        let toolPath = `${props.CMAKE_CROSS_PREFIX}${name}${props.CMAKE_CROSS_SUFFIX || ""}`
        const exists = File.exists(toolPath)
        if (!exists) {
          if (!optional) {
            throw `Tool path for ${name} does not exist: ${toolPath}`
          } else {
            log.info(`Unable to find optional tool ${name} @ ${toolPath}`)
            toolPath = null
          }
        }
        return toolPath
      }
    
    Object.assign(props,{
      CC: makeCrossTool('gcc'),
      CXX: makeCrossTool('g++'),
      CPP: makeCrossTool('g++'),
      AR: makeCrossTool('ar'),
      RANLIB: makeCrossTool('ranlib'),
      OBJDUMP: makeCrossTool('objdump'),
      STRIP: makeCrossTool('strip'),
      NM: makeCrossTool('nm'),
      OBJCOPY: makeCrossTool('objcopy'),
      LD: makeCrossTool('ld'),
      LDD: makeCrossTool('ldd', true),
      STRINGS: makeCrossTool('strings', true),
      SYSROOT: props.SYSROOT || props.CMAKE_SYSROOT
    })
    return props
  }
  
  /**
   * Create CMake command line options
   */
  toCMakeOptions() {
    const opts = {}
    if (this.androidOpts) {
     Object.assign(opts,this.androidOpts)
    } else if (this.file) {
      opts["CMAKE_TOOLCHAIN_FILE"] =this.file
    }
    
    
    return opts
  }
  
  toString() {
    return this.name || this.triplet.toString()
  }
}


