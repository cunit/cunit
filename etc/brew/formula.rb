class CunitManager < Formula
  desc "A full blown c/c++ dependency & tool manager"
  homepage "http://github.com/cxxpods/cxxpods"
  url "https://github.com/cxxpods/cxxpods/archive/v0.0.9.tar.gz"
  sha256 "e39147b48c8163bbaaa5db908277aa376fec5f3b2a5f5edecd1716ab9a95c66e"

  depends_on "node" => :build
  depends_on "npm" => :build
  def install
    system "#{HOMEBREW_PREFIX}/bin/npm", "i"
    puts "Buildpath: #{buildpath}"
    system "ls", buildpath
    prefix.install Dir["*"]

    mv bin/"cxxpods.js", bin/"cxxpods"
  end

  test do
    # `test do` will create, run in and delete a temporary directory.
    #
    # This test will fail and we won't accept that! For Homebrew/homebrew-core
    # this will need to be a test that verifies the functionality of the
    # software. Run the test with `brew test cxxpods-manager`. Options passed
    # to `brew install` such as `--HEAD` also need to be provided to `brew test`.
    #
    # The installed folder is not in the path, so use the entire path to any
    # executables being tested: `system "#{bin}/program", "do", "something"`.
    system bin/"cxxpods","repo","update"
  end
end