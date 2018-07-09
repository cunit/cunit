import Triplet from "../../project/Triplet"
import {CompilerType, Processor, System} from "../../project/BuildConstants"
import * as Tmp from 'tmp'
import Git from 'simple-git/promise'
import * as sh from 'shelljs'
import {exists, fixPath} from "../../util/File"
import {Environment, Paths} from "../../Config"

// 15 MINUTE TIMEOUT
jest.setTimeout(60000 * 15)

test('Configure and compile',async () => {
  expect.assertions(5)
  
  const
    projectTmp = Tmp.dirSync(),
    projectDir = projectTmp.name,
    git = Git(projectDir),
    dir = `${projectDir}/cunit-example`,
    buildDir = `${dir}/build`,
    cleanup = () => {
      sh.rm('-rf',dir)
      projectTmp.removeCallback()
    }
    
  
  try {
    await git.clone('https://github.com/cunit/cunit-example.git', 'cunit-example')
    
    expect(exists(`${dir}/cunit.yml`)).toBeTruthy()
  
    sh.cd(dir)
    await require('../../project/Configure').configure()
    sh.mkdir(buildDir)
    sh.cd(buildDir)
    
    expect(sh.exec(`${Paths.CMake} -DCMAKE_BUILD_TYPE="" ${dir}`).code).toBe(0)
    expect(sh.exec(`${Paths.Make} -j${Environment.CUNIT_PROC_COUNT}`).code).toBe(0)
    
    const result = sh.exec(`${buildDir}/cunit_example`)
    expect(result.code).toBe(0)
    expect(result.stdout.indexOf('My name is: Joey')).not.toBe(-1)
    
  } catch (ex) {
    console.log(`An error occurred`, ex)
    cleanup()
  }
  cleanup()
  
})

// test("Triplet toString()", () => {
//   expect(`${new Triplet(System.Android,Processor.aarch64,CompilerType.GNU)}`)
//     .toBe(`${Processor.aarch64}-${System.Android.toLowerCase()}-${CompilerType.GNU.toLowerCase()}`)
// })

