=> ERROR [ 6/14] RUN extras/check_dependencies.sh     && make -j"$(nproc)"                                                  0.4s 
------                                                                                                                            
 > [ 6/14] RUN extras/check_dependencies.sh     && make -j"$(nproc)":                                                             
0.264 extras/check_dependencies.sh: unzip is not installed.
0.265 extras/check_dependencies.sh: python2.7 is not installed
0.265 extras/check_dependencies.sh: python3 present
0.266 extras/check_dependencies.sh: Configuring python
0.266 extras/check_dependencies.sh: ... If you really want to avoid this, add an empty file /opt/kaldi/tools/python/.use_default_python and run this script again.
0.267 extras/check_dependencies.sh: ... python3 found, making symlink (python3)
0.268 ln: failed to create symbolic link '/opt/kaldi/tools/python/python3': No such file or directory
0.268 extras/check_dependencies.sh: ... ... python2.7 not found, using python3 as python
0.269 ln: failed to create symbolic link '/opt/kaldi/tools/python/python': No such file or directory
0.279 extras/check_dependencies.sh: Intel MKL does not seem to be installed.
0.280  ... Run extras/install_mkl.sh to install it. Some distros (e.g., Ubuntu 20.04) provide
0.280  ... a version of MKL via the package manager, but verify that it is up-to-date.
0.280  ... You can also use other matrix algebra libraries. For information, see:
0.280  ...   http://kaldi-asr.org/doc/matrixwrap.html
0.283 extras/check_dependencies.sh: Some prerequisites are missing; install them using the command:
0.283   sudo apt-get install unzip
------
api-gpu-cuda12.dockerfile:32
--------------------
  31 |     WORKDIR /opt/kaldi/tools
  32 | >>> RUN extras/check_dependencies.sh \
  33 | >>>     && make -j"$(nproc)"
  34 |     
--------------------
ERROR: failed to solve: process "/bin/sh -c extras/check_dependencies.sh     && make -j\"$(nproc)\"" did not complete successfully: exit code: 1
