from app import __version__
def test_version_exists():
    assert isinstance(__version__, str) and len(__version__) > 0
